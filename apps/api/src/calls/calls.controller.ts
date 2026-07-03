import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { TelnyxService } from '../telnyx/telnyx.service';
import { DbService } from '../db/db.service';
import { isOpen, DEFAULT_SCHEDULE, WeeklySchedule } from './business-hours';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';
import { PushService } from '../push/push.service';
import { SecretaryService } from '../ai/secretary.service';

/**
 * - Webhook Call Control de Telnyx : route les appels ENTRANTS selon les
 *   réglages du numéro (horaires -> softphone / renvoi mobile, sinon répondeur).
 * - Endpoints authentifiés : historique, messagerie, lancer un appel sortant.
 * (docs/01 §4-5, docs/08 CALL-*, FLOW-*)
 */
@Controller('calls')
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  constructor(
    private readonly telnyx: TelnyxService,
    private readonly db: DbService,
    private readonly push: PushService,
    private readonly secretary: SecretaryService,
  ) {}

  /**
   * SECRÉTARIAT IA — tampon des transcriptions temps réel, par appel.
   * Telnyx envoie des événements `call.transcription` pendant que l'appelant
   * parle ; on accumule ici puis on consomme quand l'enregistrement est prêt.
   */
  private readonly transcripts = new Map<string, { text: string; at: number }>();

  private pushTranscript(callControlId: string, segment: string) {
    // Nettoyage paresseux : on ne garde jamais plus de 30 min d'historique.
    const now = Date.now();
    for (const [k, v] of this.transcripts) {
      if (now - v.at > 30 * 60_000) this.transcripts.delete(k);
    }
    const cur = this.transcripts.get(callControlId);
    this.transcripts.set(callControlId, {
      text: cur ? `${cur.text} ${segment}`.trim() : segment.trim(),
      at: now,
    });
  }

  // ── Endpoints authentifiés (dashboard / softphone) ─────────────────────────

  @UseGuards(JwtGuard)
  @Get()
  history(@CurrentUser() user: JwtPayload) {
    return this.db.listCalls(user.accountId);
  }

  @UseGuards(JwtGuard)
  @Get('voicemails')
  voicemails(@CurrentUser() user: JwtPayload) {
    return this.db.listVoicemails(user.accountId);
  }

  /** Lancer un appel SORTANT depuis le numéro pro du compte. */
  @UseGuards(JwtGuard)
  @Post('dial')
  async dial(@CurrentUser() user: JwtPayload, @Body() body: { to: string; fromNumberId?: string }) {
    const number = body.fromNumberId
      ? this.db.findPhoneNumber(user.accountId, body.fromNumberId)
      : this.db.findFirstPhoneNumber(user.accountId);
    if (!number) return { error: 'Aucun numéro pro configuré' };

    const call = this.db.createCall({
      accountId: user.accountId,
      phoneNumberId: number.id,
      direction: 'outbound',
      fromE164: number.e164,
      toE164: body.to,
      status: 'ringing',
    });

    if (this.telnyx.configured) {
      try {
        const res = await this.telnyx.dial(body.to, number.e164);
        this.db.updateCall(call.id, { providerCallId: (res as any)?.data?.call_control_id });
      } catch (e) {
        this.db.updateCall(call.id, { status: 'failed' });
        return { error: `Échec de l'appel: ${(e as Error).message}` };
      }
    }
    return call;
  }

  // ── Webhook Telnyx (appels entrants) ───────────────────────────────────────

  @Post('webhook')
  async webhook(@Body() body: any) {
    const event = body?.data;
    if (!event) return { ok: true };
    const type: string = event.event_type;
    const payload = event.payload || {};
    const callControlId: string = payload.call_control_id;
    this.logger.log(`Webhook: ${type}`);

    switch (type) {
      case 'call.initiated': {
        if (payload.direction !== 'incoming') break;
        const number = this.db.findPhoneNumberByE164(payload.to);
        if (!number) {
          this.logger.warn(`Appel vers un numéro inconnu: ${payload.to}`);
          break;
        }
        this.db.createCall({
          accountId: number.accountId,
          phoneNumberId: number.id,
          direction: 'inbound',
          fromE164: payload.from,
          toE164: payload.to,
          status: 'ringing',
          providerCallId: callControlId,
        });

        // Sonnerie in-app : on transfère SANS décrocher (l'appelant entend la
        // sonnerie, ça ne se connecte que si on répond dans l'app). Décrocher
        // d'abord donnerait l'impression que "ça décroche tout seul".
        const st = number.settings;
        const sched: WeeklySchedule = st?.weeklySchedule
          ? safeJson(st.weeklySchedule, DEFAULT_SCHEDULE)
          : DEFAULT_SCHEDULE;
        const hol: string[] = st?.holidays ? safeJson(st.holidays, []) : [];
        const open = isOpen(sched, hol);
        const ringApp = open && st?.ringInApp && !st?.forwardToMobile;
        if (ringApp) {
          // L'app se connecte avec les identifiants de la CONNEXION -> on route
          // l'appel vers le user_name de la connexion (joignable en entrant).
          const sipUser = await this.telnyx.getCredentialSipUser();
          if (sipUser) {
            this.logger.log(`Sonnerie in-app de ${payload.to} -> sip:${sipUser}`);
            let transferErr: string | null = null;
            try {
              // payload.from = numéro de l'appelant -> affiché dans l'app.
              await this.telnyx.transferToUser(callControlId, sipUser, 45, payload.from);
            } catch (e) {
              transferErr = (e as Error).message;
            }
            this.db.logInbound({ from: payload.from, to: payload.to, decision: 'ringing-app', open, sipUser, transferErr });
            this.updateByProvider(callControlId, { status: 'ringing-app' });
            break; // ⚠️ surtout pas de answer ici
          }
          this.db.logInbound({ from: payload.from, to: payload.to, decision: 'sipUser-null', open, ringInApp: true });
        } else {
          this.db.logInbound({ from: payload.from, to: payload.to, decision: open ? (st?.forwardToMobile ? 'forward' : 'voicemail') : 'closed-voicemail', open, ringInApp: !!st?.ringInApp, forwardToMobile: !!st?.forwardToMobile });
        }

        // Tous les autres cas (répondeur, renvoi, fermé) : on décroche pour
        // pouvoir jouer le message / renvoyer (logique sur call.answered).
        try {
          await this.telnyx.answer(callControlId);
        } catch (e) {
          this.logger.warn(`answer KO: ${(e as Error).message}`);
        }
        break;
      }

      case 'call.answered': {
        const call = this.db.findCallByProviderId(callControlId);
        // ⚠️ Ne traiter QUE les appels entrants qu'on gère. Sinon, quand un appel
        // SORTANT est décroché, on jouait le répondeur par-dessus (bug du "ça
        // bascule sur mon répondeur"). Si pas de fiche d'appel -> on ignore.
        if (!call || call.direction !== 'inbound') break;
        // Sonnerie in-app déjà déclenchée sur call.initiated : l'app a décroché
        // le transfert -> rien à faire ici (sinon on jouerait le répondeur).
        if (call.status === 'ringing-app') break;
        const settings = call?.phoneNumber?.settings;
        const schedule: WeeklySchedule = settings?.weeklySchedule
          ? safeJson(settings.weeklySchedule, DEFAULT_SCHEDULE)
          : DEFAULT_SCHEDULE;
        const holidays: string[] = settings?.holidays ? safeJson(settings.holidays, []) : [];

        if (isOpen(schedule, holidays)) {
          const fwd = toE164Fr(settings?.forwardNumber || '');
          if (settings?.forwardToMobile && fwd) {
            // Renvoi vers le mobile (fiable). Présente le n° pro comme caller ID.
            this.logger.log(`Renvoi de ${call.toE164} vers ${fwd}`);
            await this.telnyx.transferToPstn(callControlId, fwd, call?.toE164);
            this.updateByProvider(callControlId, { status: 'forwarded' });
          } else if (settings?.voicemailEnabled !== false) {
            // Pas de renvoi configuré : SECRÉTARIAT IA. On accueille, on invite
            // à détailler (nom / raison / dispo), on enregistre ET on transcrit
            // en temps réel pour qualifier le message (devis, urgence, RDV…).
            await this.safeSpeak(
              callControlId,
              settings?.greetingOpen || this.secretaryGreeting(call?.accountId),
              settings?.greetingVoice || 'Polly.Lea-Neural',
            );
            await this.safeRecord(callControlId);
            await this.safeTranscribe(callControlId);
            this.updateByProvider(callControlId, { status: 'voicemail' });
          } else {
            await this.telnyx.hangup(callControlId);
          }
        } else {
          const call2 = this.db.findCallByProviderId(callControlId);
          await this.safeSpeak(
            callControlId,
            settings?.greetingClosed || this.secretaryGreeting(call2?.accountId, true),
            settings?.greetingVoice || 'Polly.Lea-Neural',
          );
          if (settings?.voicemailEnabled !== false) {
            await this.safeRecord(callControlId);
            await this.safeTranscribe(callControlId);
            this.updateByProvider(callControlId, { status: 'voicemail' });
          }
        }
        break;
      }

      case 'call.transcription': {
        // Secrétariat IA : segments de transcription temps réel (fr).
        const td = payload.transcription_data || payload;
        const segment: string = td?.transcript || td?.text || '';
        const isFinal = td?.is_final !== false; // absent => on prend
        if (segment && isFinal) this.pushTranscript(callControlId, segment);
        break;
      }

      case 'call.recording.saved': {
        const call = this.db.findCallByProviderId(callControlId);
        // URL publique en priorité (lisible directement par le navigateur)
        const url = payload.public_recording_urls?.mp3 || payload.recording_urls?.mp3;
        if (call) {
          const vm = this.db.createVoicemail({ callId: call.id, audioUrl: url });
          // SECRÉTARIAT IA : transcription accumulée pendant l'appel -> analyse
          // (catégorie, urgence, résumé) -> fiche + notification qualifiée.
          const transcript = this.transcripts.get(callControlId)?.text || '';
          this.transcripts.delete(callControlId);
          if (transcript) {
            this.db.updateVoicemail(vm.id, {
              transcriptionText: transcript,
              transcriptionStatus: 'done',
            });
            const a = await this.secretary.analyze(transcript);
            this.db.updateVoicemail(vm.id, {
              aiCategory: a.category,
              aiUrgency: a.urgency,
              aiSummary: a.summary,
            });
            this.push.notifyAccount(call.accountId, {
              title: `${SecretaryService.label(a.category)}${a.urgency === 'haute' ? ' — urgent' : ''}`,
              body: a.summary
                ? `${a.summary} (${call.fromE164})`
                : `De ${call.fromE164}`,
              data: { screen: 'Messages' },
            });
          } else {
            this.db.updateVoicemail(vm.id, { transcriptionStatus: 'none' });
            this.push.notifyAccount(call.accountId, {
              title: 'Nouveau message vocal 🎙️',
              body: `De ${call.fromE164}`,
              data: { screen: 'Messages' },
            });
          }
        }
        break;
      }

      case 'call.hangup': {
        // Diagnostic : cause de raccrochage (utile pour la jambe de transfert
        // vers l'app -> montre si l'INVITE a sonné, été rejeté, 404, etc.).
        this.db.logInbound({
          type: 'hangup',
          from: payload.from,
          to: payload.to,
          dir: payload.direction,
          cause: payload.hangup_cause,
          sipCause: payload.sip_hangup_cause,
        });
        const call = this.db.findCallByProviderId(callControlId);
        if (call) {
          const durationS = Math.round((Date.now() - new Date(call.startedAt).getTime()) / 1000);
          const finalStatus =
            call.status === 'ringing'
              ? 'missed'
              : call.status === 'answered'
                ? 'completed'
                : call.status;
          this.db.updateCall(call.id, {
            status: finalStatus,
            endedAt: new Date().toISOString(),
            durationS,
          });
          // Notif push appel manqué : cas clair (status resté 'ringing') OU appel
          // in-app non décroché (ringing-app + cause "sans réponse" côté SIP).
          const cause = `${payload.hangup_cause || ''} ${payload.sip_hangup_cause || ''}`;
          const inAppNoAnswer =
            call.status === 'ringing-app' && /487|480|408|cancel|timeout|no_?answer|unspecified/i.test(cause);
          if (call.direction === 'inbound' && (finalStatus === 'missed' || inAppNoAnswer)) {
            this.push.notifyAccount(call.accountId, {
              title: 'Appel manqué 📞',
              body: `De ${call.fromE164}`,
              data: { screen: 'Appels' },
            });
          }
        }
        break;
      }
    }
    return { ok: true };
  }

  /** Message d'accueil du secrétariat (par défaut, personnalisable par numéro). */
  private secretaryGreeting(accountId?: string, closed = false): string {
    const company = accountId ? this.db.findAccountById(accountId)?.companyName : '';
    const intro = company ? `Bonjour, vous êtes bien chez ${company}.` : 'Bonjour.';
    const closedTxt = closed ? ' Nous sommes actuellement fermés.' : '';
    return (
      `${intro}${closedTxt} Je suis l'assistant de la ligne. ` +
      `Après le bip, indiquez votre nom, la raison de votre appel — devis, urgence ou rendez-vous — ` +
      `et vos disponibilités. Votre message est transmis immédiatement. Merci !`
    );
  }

  /** Démarre la transcription temps réel sans jamais faire échouer l'appel. */
  private async safeTranscribe(callControlId: string) {
    try {
      await this.telnyx.transcriptionStart(callControlId);
    } catch (e) {
      this.logger.warn(`transcription_start KO: ${(e as Error).message}`);
    }
  }

  /** speak/record tolérants : un échec ne doit pas casser la suite du flux. */
  private async safeSpeak(callControlId: string, text: string, voice?: string) {
    try {
      await this.telnyx.speak(callControlId, text, voice);
    } catch (e) {
      this.logger.warn(`speak KO: ${(e as Error).message}`);
    }
  }

  private async safeRecord(callControlId: string) {
    try {
      await this.telnyx.recordStart(callControlId);
    } catch (e) {
      this.logger.warn(`record_start KO: ${(e as Error).message}`);
    }
  }

  private updateByProvider(providerCallId: string, patch: any) {
    const call = this.db.findCallByProviderId(providerCallId);
    if (call) this.db.updateCall(call.id, patch);
  }
}

/** Normalise un numéro FR en E.164 : 06... -> +336..., 0033... -> +33..., défaut FR. */
function toE164Fr(raw: string): string {
  const d = (raw || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d;
  if (d.startsWith('0033')) return '+' + d.slice(2);
  if (d.startsWith('33')) return '+' + d;
  if (d.startsWith('0')) return '+33' + d.slice(1);
  return '+33' + d;
}

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
