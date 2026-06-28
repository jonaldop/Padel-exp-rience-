import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { TelnyxService } from '../telnyx/telnyx.service';
import { DbService } from '../db/db.service';
import { isOpen, DEFAULT_SCHEDULE, WeeklySchedule } from './business-hours';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

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
  ) {}

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
              await this.telnyx.transferToUser(callControlId, sipUser, 25);
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
        await this.telnyx.answer(callControlId);
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
            // Pas de renvoi configuré : on prend un message (le softphone web ne
            // peut pas sonner de façon fiable -> ce sera l'app native + CallKit).
            await this.telnyx.speak(
              callControlId,
              settings?.greetingOpen ||
                'Bonjour, merci de laisser un message, nous vous rappellerons.',
              settings?.greetingVoice || 'Polly.Lea-Neural',
            );
            await this.telnyx.recordStart(callControlId);
            this.updateByProvider(callControlId, { status: 'voicemail' });
          } else {
            await this.telnyx.hangup(callControlId);
          }
        } else {
          await this.telnyx.speak(
            callControlId,
            settings?.greetingClosed ||
              'Nos bureaux sont fermés. Laissez un message après le bip.',
            settings?.greetingVoice || 'Polly.Lea-Neural',
          );
          if (settings?.voicemailEnabled !== false) {
            await this.telnyx.recordStart(callControlId);
            this.updateByProvider(callControlId, { status: 'voicemail' });
          }
        }
        break;
      }

      case 'call.recording.saved': {
        const call = this.db.findCallByProviderId(callControlId);
        // URL publique en priorité (lisible directement par le navigateur)
        const url = payload.public_recording_urls?.mp3 || payload.recording_urls?.mp3;
        if (call) {
          this.db.createVoicemail({ callId: call.id, audioUrl: url });
          // TODO (V2) : enqueue transcription Whisper/Deepgram (ticket AI-1)
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
          // TODO : si missed -> notification push + email (ticket FLOW-6)
        }
        break;
      }
    }
    return { ok: true };
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
