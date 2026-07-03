import { Body, Controller, Delete, Get, Logger, Param, Post, UseGuards } from '@nestjs/common';
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

  /** Résultats structurés du secrétaire conversationnel (call.ai_gather.ended). */
  private readonly aiGathers = new Map<string, { data: any; at: number }>();

  /** Enregistrements déjà démarrés (évite les doublons au call.speak.ended). */
  private readonly recordingStarted = new Set<string>();
  /** Appels à raccrocher quand le message parlé en cours se termine. */
  private readonly pendingHangup = new Set<string>();

  /** Appels d'APERÇU (test du message d'accueil) : ccid -> texte + voix. */
  private readonly previewCalls = new Map<string, { text: string; voice: string }>();

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

  /**
   * L'app DÉCLARE un appel SORTANT passé en WebRTC : ces appels partent
   * directement de l'app vers Telnyx, le serveur ne les voit pas — sans ça,
   * ils manquent à l'historique ET au décompte des minutes (pare-feu).
   */
  @UseGuards(JwtGuard)
  @Post('report')
  reportOutbound(
    @CurrentUser() user: JwtPayload,
    @Body() body: { to?: string; durationS?: number; status?: string },
  ) {
    const number = this.db.findFirstPhoneNumber(user.accountId);
    if (!number) return { error: 'Aucun numéro pro configuré' };
    const to = toE164Fr(body.to || '');
    if (!to) return { error: 'Numéro invalide' };
    const durationS = Math.max(0, Math.min(4 * 3600, Math.round(Number(body.durationS) || 0)));
    const allowed = ['completed', 'canceled', 'failed'];
    const status = allowed.includes(body.status || '')
      ? (body.status as string)
      : durationS > 0 ? 'completed' : 'canceled';
    const call = this.db.createCall({
      accountId: user.accountId,
      phoneNumberId: number.id,
      direction: 'outbound',
      fromE164: number.e164,
      toE164: to,
      status,
      durationS,
    });
    // startedAt = début réel (créé à la fin de l'appel).
    this.db.updateCall(call.id, {
      startedAt: new Date(Date.now() - durationS * 1000).toISOString(),
      endedAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  /** Marque tous les vocaux comme lus (éteint le badge de la cloche). */
  @UseGuards(JwtGuard)
  @Post('voicemails/mark-read')
  markVoicemailsRead(@CurrentUser() user: JwtPayload) {
    return { ok: true, updated: this.db.markVoicemailsRead(user.accountId) };
  }

  /** Supprimer un message vocal (glisser-supprimer dans l'app). */
  @UseGuards(JwtGuard)
  @Delete('voicemails/:id')
  deleteVoicemail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const vm = this.db.findVoicemailById(id);
    if (!vm) return { error: 'Message introuvable' };
    const call = this.db.findCallById(vm.callId);
    if (!call || call.accountId !== user.accountId) {
      return { error: 'Message introuvable' }; // pas à ce compte
    }
    this.db.deleteVoicemail(id);
    return { ok: true };
  }

  /** Lancer un appel SORTANT depuis le numéro pro du compte. */
  @UseGuards(JwtGuard)
  @Post('dial')
  async dial(@CurrentUser() user: JwtPayload, @Body() body: { to: string; fromNumberId?: string }) {
    const number = body.fromNumberId
      ? this.db.findPhoneNumber(user.accountId, body.fromNumberId)
      : this.db.findFirstPhoneNumber(user.accountId);
    if (!number) return { error: 'Aucun numéro pro configuré' };

    // PARE-FEU : destinations France/DOM/frontaliers uniquement + plafond mensuel.
    const dest = toE164Fr(body.to);
    if (!destinationAllowed(dest)) {
      return { error: 'Les appels internationaux ne sont pas disponibles sur votre forfait.' };
    }
    const guard = this.db.usageGuard(user.accountId);
    if (guard.state === 'blocked') {
      return {
        error: `Plafond mensuel atteint (${guard.capMinutes} min). Contactez-nous pour augmenter votre forfait.`,
      };
    }

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

  /**
   * APERÇU DU MESSAGE D'ACCUEIL : Joe appelle le mobile de l'artisan et joue
   * le message (voix + texte réels, exactement comme l'entendra un client).
   */
  @UseGuards(JwtGuard)
  @Post('preview-greeting')
  async previewGreeting(
    @CurrentUser() user: JwtPayload,
    @Body() body: { numberId?: string; which?: 'open' | 'closed'; text?: string; voice?: string; to?: string },
  ) {
    const number = body.numberId
      ? this.db.findPhoneNumber(user.accountId, body.numberId)
      : this.db.findFirstPhoneNumber(user.accountId);
    if (!number) return { error: 'Aucun numéro pro configuré' };
    const to = toE164Fr(body.to || '');
    if (!to || !destinationAllowed(to)) {
      return { error: 'Indiquez un numéro français à appeler pour le test.' };
    }
    const closed = body.which === 'closed';
    const st = number.settings;
    const text =
      (body.text || '').trim() ||
      (closed ? st?.greetingClosed : st?.greetingOpen) ||
      this.secretaryGreeting(user.accountId, closed);
    const voice = body.voice || st?.greetingVoice || 'Polly.Lea-Neural';
    try {
      const res: any = await this.telnyx.dial(to, number.e164);
      const ccid = res?.data?.call_control_id;
      if (ccid) this.previewCalls.set(ccid, { text, voice });
      return { ok: true, calling: to };
    } catch (e) {
      return { error: `Test impossible : ${(e as Error).message}` };
    }
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
        if (payload.direction !== 'incoming') {
          // Appel SORTANT (app WebRTC) : filet de sécurité du pare-feu — si la
          // destination est hors politique ou le plafond atteint, on raccroche.
          const proNumber = this.db.findPhoneNumberByE164(payload.from);
          if (proNumber) {
            const dest = String(payload.to || '');
            const g = this.db.usageGuard(proNumber.accountId);
            if ((dest.startsWith('+') && !destinationAllowed(dest)) || g.state === 'blocked') {
              this.db.logInbound({
                type: 'outbound-blocked',
                from: payload.from,
                to: payload.to,
                reason: g.state === 'blocked' ? `cap ${g.capMinutes}min atteint` : 'destination hors politique',
              });
              try {
                await this.telnyx.hangup(callControlId);
              } catch { /* déjà terminé */ }
            }
          }
          break;
        }
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
              // Sonnerie bornée (réglage du numéro, défaut 25 s ≈ 5 sonneries) :
              // sans réponse, la jambe SIP meurt et le répondeur prend (cf. hangup).
              const ringSecs = Math.min(Math.max(st?.ringTimeoutS || 25, 10), 45);
              await this.telnyx.transferToUser(callControlId, sipUser, ringSecs, payload.from);
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
        // Appel d'APERÇU décroché par l'artisan -> on joue le message puis on
        // raccroche à la fin (via call.speak.ended + pendingHangup).
        const preview = this.previewCalls.get(callControlId);
        if (preview) {
          this.previewCalls.delete(callControlId);
          this.pendingHangup.add(callControlId);
          const ok = await this.safeSpeak(callControlId, preview.text, preview.voice);
          if (!ok) {
            this.pendingHangup.delete(callControlId);
            try { await this.telnyx.hangup(callControlId); } catch { /* fini */ }
          }
          break;
        }
        const call = this.db.findCallByProviderId(callControlId);
        // ⚠️ Ne traiter QUE les appels entrants qu'on gère. Sinon, quand un appel
        // SORTANT est décroché, on jouait le répondeur par-dessus (bug du "ça
        // bascule sur mon répondeur"). Si pas de fiche d'appel -> on ignore.
        if (!call || call.direction !== 'inbound') break;
        // Sonnerie in-app déjà déclenchée sur call.initiated : l'app a décroché
        // le transfert -> on note juste que l'appel est en cours.
        if (call.status === 'ringing-app') {
          this.db.updateCall(call.id, { status: 'answered' });
          break;
        }
        // Déjà basculé sur le répondeur (repli après sonnerie sans réponse).
        if (call.status === 'voicemail') break;
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
            this.updateByProvider(callControlId, { status: 'voicemail' });
            await this.secretaryEngage(
              callControlId,
              call?.accountId,
              settings?.greetingOpen,
              settings?.greetingVoice,
              false,
              settings?.aiConversational === true,
            );
          } else {
            await this.telnyx.hangup(callControlId);
          }
        } else {
          const call2 = this.db.findCallByProviderId(callControlId);
          if (settings?.voicemailEnabled !== false) {
            this.updateByProvider(callControlId, { status: 'voicemail' });
            await this.secretaryEngage(
              callControlId,
              call2?.accountId,
              settings?.greetingClosed,
              settings?.greetingVoice,
              true,
              settings?.aiConversational === true,
            );
          } else {
            await this.safeSpeak(
              callControlId,
              settings?.greetingClosed || this.secretaryGreeting(call2?.accountId, true),
              settings?.greetingVoice || 'Polly.Lea-Neural',
            );
          }
        }
        break;
      }

      case 'call.ai_gather.ended': {
        // SECRÉTAIRE CONVERSATIONNEL : réponses structurées de l'appelant.
        const result = payload.result || payload.results || payload.data || null;
        if (result && typeof result === 'object') {
          this.aiGathers.set(callControlId, { data: result, at: Date.now() });
          // Si le message vocal est déjà créé (enregistrement déjà sauvegardé),
          // on l'enrichit après coup.
          const call = this.db.findCallByProviderId(callControlId);
          const vm = call ? this.db.findVoicemailByCallId(call.id) : null;
          if (vm) this.applyGatherToVoicemail(vm.id, result);
        }
        this.pendingHangup.add(callControlId);
        const thanked = await this.safeSpeak(
          callControlId,
          'Merci, votre message est transmis immédiatement. Très bonne journée !',
        );
        if (!thanked) {
          this.pendingHangup.delete(callControlId);
          try {
            await this.telnyx.hangup(callControlId);
          } catch { /* déjà raccroché */ }
        }
        break;
      }

      case 'call.speak.ended': {
        // Fin du « merci » post-conversation -> on raccroche maintenant (pas avant,
        // sinon le remerciement serait coupé).
        if (this.pendingHangup.has(callControlId)) {
          this.pendingHangup.delete(callControlId);
          try {
            await this.telnyx.hangup(callControlId);
          } catch { /* déjà terminé */ }
          break;
        }
        // Fin de l'annonce du répondeur classique -> BIP + enregistrement.
        const call = this.db.findCallByProviderId(callControlId);
        if (
          call?.direction === 'inbound' &&
          call.status === 'voicemail' &&
          !this.recordingStarted.has(callControlId)
        ) {
          this.recordingStarted.add(callControlId);
          await this.safeRecord(callControlId, true);
          await this.safeTranscribe(callControlId);
        }
        break;
      }

      case 'call.transcription': {
        // Secrétariat IA : segments de transcription temps réel (fr).
        const td = payload.transcription_data || payload;
        const segment: string = td?.transcript || td?.text || '';
        const isFinal = td?.is_final !== false; // absent => on prend
        if (segment && isFinal) {
          if (!this.transcripts.has(callControlId)) {
            this.db.logInbound({ type: 'transcription-evt', first: true, len: segment.length });
          }
          this.pushTranscript(callControlId, segment);
          // Événement TARDIF (message vocal déjà sauvegardé, ou serveur
          // redémarré entre-temps) : on complète la fiche après coup.
          const call = this.db.findCallByProviderId(callControlId);
          const vm = call ? this.db.findVoicemailByCallId(call.id) : null;
          if (vm) {
            const full = this.transcripts.get(callControlId)?.text || segment;
            this.db.updateVoicemail(vm.id, {
              transcriptionText: full,
              transcriptionStatus: 'done',
            });
            if (!vm.aiSummary) {
              const a = await this.secretary.analyze(full);
              this.db.updateVoicemail(vm.id, {
                aiCategory: a.category,
                aiUrgency: a.urgency,
                aiSummary: a.summary,
              });
            }
          }
        }
        break;
      }

      case 'call.recording.saved': {
        const call = this.db.findCallByProviderId(callControlId);
        // URL publique en priorité (lisible directement par le navigateur)
        const url = payload.public_recording_urls?.mp3 || payload.recording_urls?.mp3;
        if (call) {
          const vm = this.db.createVoicemail({
            callId: call.id,
            audioUrl: url,
            recordingId: payload.recording_id || null,
          });
          // SECRÉTARIAT IA : transcription accumulée pendant l'appel -> analyse
          // (catégorie, urgence, résumé) -> fiche + notification qualifiée.
          const transcript = this.transcripts.get(callControlId)?.text || '';
          this.transcripts.delete(callControlId);
          this.db.logInbound({ type: 'vm-saved', transcriptLen: transcript.length });
          const gather = this.aiGathers.get(callControlId)?.data || null;
          this.aiGathers.delete(callControlId);
          if (transcript || gather) {
            if (transcript) {
              this.db.updateVoicemail(vm.id, {
                transcriptionText: transcript,
                transcriptionStatus: 'done',
              });
            } else {
              this.db.updateVoicemail(vm.id, { transcriptionStatus: 'none' });
            }
            // Les réponses STRUCTURÉES du secrétaire conversationnel priment ;
            // sinon, analyse de la transcription (LLM ou mots-clés).
            let a: { category: string; urgency: string; summary: string };
            if (gather) {
              a = this.applyGatherToVoicemail(vm.id, gather);
            } else {
              const r = await this.secretary.analyze(transcript);
              a = r;
              this.db.updateVoicemail(vm.id, {
                aiCategory: r.category,
                aiUrgency: r.urgency,
                aiSummary: r.summary,
              });
            }
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
        this.recordingStarted.delete(callControlId);
        this.pendingHangup.delete(callControlId);
        this.previewCalls.delete(callControlId);

        // JAMBE SIP du transfert vers l'app (to = sip:...) : si elle meurt
        // SANS réponse (timeout, refus, annulation), l'appelant est toujours
        // en ligne sur la jambe A -> on décroche et on passe au RÉPONDEUR.
        if (String(payload.to || '').startsWith('sip:')) {
          const cause = `${payload.hangup_cause || ''} ${payload.sip_hangup_cause || ''}`;
          const noAnswer = /487|480|486|408|timeout|cancel|no_?answer|reject|busy|unspecified/i.test(cause);
          const aLeg = noAnswer ? this.db.findRingingAppCall(payload.from) : null;
          if (aLeg?.providerCallId) {
            this.db.logInbound({ type: 'app-no-answer->voicemail', from: payload.from, cause });
            this.db.updateCall(aLeg.id, { status: 'voicemail' });
            try {
              await this.telnyx.answer(aLeg.providerCallId);
              const settings = this.db.findPhoneNumberByE164(aLeg.toE164)?.settings;
              const sched: WeeklySchedule = settings?.weeklySchedule
                ? safeJson(settings.weeklySchedule, DEFAULT_SCHEDULE)
                : DEFAULT_SCHEDULE;
              const hol: string[] = settings?.holidays ? safeJson(settings.holidays, []) : [];
              const open = isOpen(sched, hol);
              await this.secretaryEngage(
                aLeg.providerCallId,
                aLeg.accountId,
                open ? settings?.greetingOpen : settings?.greetingClosed,
                settings?.greetingVoice,
                !open,
                settings?.aiConversational === true,
              );
            } catch (e) {
              this.logger.warn(`Repli répondeur après sonnerie KO: ${(e as Error).message}`);
            }
          }
          this.db.logInbound({
            type: 'hangup',
            from: payload.from,
            to: payload.to,
            dir: payload.direction,
            cause: payload.hangup_cause,
            sipCause: payload.sip_hangup_cause,
          });
          break;
        }
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

      default: {
        // Diagnostic : trace les événements non gérés (permet de repérer une
        // transcription qui arriverait sous un autre nom d'événement).
        this.db.logInbound({ type: 'evt', t: type });
        break;
      }
    }
    return { ok: true };
  }

  /**
   * Engage le secrétariat : tente la CONVERSATION IA (questions/réponses) si
   * activée, sinon (ou si l'API n'est pas dispo sur le compte Telnyx) repli
   * sur l'accueil parlé classique + enregistrement déjà lancé.
   */
  private async secretaryEngage(
    callControlId: string,
    accountId: string | undefined,
    customGreeting: string | undefined,
    voice: string | undefined,
    closed: boolean,
    conversational: boolean,
  ) {
    const greeting = customGreeting || this.secretaryGreeting(accountId, closed);
    if (conversational) {
      // Conversation IA : on enregistre tout l'échange (sans bip) dès le début.
      await this.safeRecord(callControlId);
      this.recordingStarted.add(callControlId);
      await this.safeTranscribe(callControlId);
      try {
        // Accueil COURT dédié à la conversation (pas de « après le bip ») :
        // moins de mots = échange plus réactif. Un accueil personnalisé garde
        // la priorité s'il est défini.
        const company = accountId ? this.db.findAccountById(accountId)?.companyName : '';
        const convGreeting =
          customGreeting ||
          `Bonjour${company ? `, vous êtes bien chez ${company}` : ''} !` +
            `${closed ? ' Nous sommes fermés, mais je prends votre demande.' : ''}` +
            ` Que puis-je faire pour vous : un devis, une urgence, ou un rendez-vous ?`;
        await this.telnyx.gatherUsingAi(callControlId, convGreeting, company);
        return; // l'IA mène l'échange ; la suite arrive via call.ai_gather.ended
      } catch (e) {
        this.logger.warn(`gather_using_ai KO (${(e as Error).message}) -> répondeur classique`);
        // L'enregistrement tourne déjà : on enchaîne sur l'annonce classique.
      }
    }
    // Répondeur classique : annonce, puis BIP + enregistrement au call.speak.ended
    // (sinon le bip jouerait par-dessus l'annonce).
    const spoke = await this.safeSpeak(callControlId, greeting, voice || 'Polly.Lea-Neural');
    if (!spoke && !this.recordingStarted.has(callControlId)) {
      // L'annonce a échoué -> on enregistre quand même (filet de sécurité).
      this.recordingStarted.add(callControlId);
      await this.safeRecord(callControlId, true);
      await this.safeTranscribe(callControlId);
    }
  }

  /** Applique les réponses structurées du secrétaire au message vocal. */
  private applyGatherToVoicemail(
    vmId: string,
    g: any,
  ): { category: string; urgency: string; summary: string } {
    const category = ['devis', 'urgence', 'rdv', 'rappel', 'autre'].includes(g.motif)
      ? g.motif
      : 'autre';
    const urgent = /urgent|urgence|fuite|panne|inond|d[ée]g[aâ]t|tout de suite|aujourd/i.test(String(g.details || ''));
    const urgency = g.urgence === true || g.urgence === 'true' || category === 'urgence' || urgent ? 'haute' : 'normale';
    const parts = [
      g.nom ? String(g.nom) : null,
      g.details ? String(g.details) : null,
      g.disponibilites ? `rappeler : ${g.disponibilites}` : null,
    ].filter(Boolean);
    const summary = parts.join(' — ').slice(0, 300);
    this.db.updateVoicemail(vmId, { aiCategory: category, aiUrgency: urgency, aiSummary: summary });
    return { category, urgency, summary };
  }

  /** Message d'accueil du secrétariat (par défaut, personnalisable par numéro). */
  private secretaryGreeting(accountId?: string, closed = false): string {
    const company = accountId ? this.db.findAccountById(accountId)?.companyName : '';
    return SecretaryService.greeting(company, closed);
  }

  /** Démarre la transcription temps réel sans jamais faire échouer l'appel. */
  private async safeTranscribe(callControlId: string) {
    try {
      await this.telnyx.transcriptionStart(callControlId);
      this.db.logInbound({ type: 'transcribe-start', ok: true });
    } catch (e) {
      this.logger.warn(`transcription_start KO: ${(e as Error).message}`);
      this.db.logInbound({ type: 'transcribe-start', ok: false, err: (e as Error).message.slice(0, 160) });
    }
  }

  /** speak/record tolérants : un échec ne doit pas casser la suite du flux. */
  private async safeSpeak(callControlId: string, text: string, voice?: string): Promise<boolean> {
    try {
      await this.telnyx.speak(callControlId, text, voice);
      return true;
    } catch (e) {
      this.logger.warn(`speak KO: ${(e as Error).message}`);
      return false;
    }
  }

  private async safeRecord(callControlId: string, playBeep = false) {
    try {
      await this.telnyx.recordStart(callControlId, playBeep);
    } catch (e) {
      this.logger.warn(`record_start KO: ${(e as Error).message}`);
    }
  }

  private updateByProvider(providerCallId: string, patch: any) {
    const call = this.db.findCallByProviderId(providerCallId);
    if (call) this.db.updateCall(call.id, patch);
  }
}

/**
 * Destinations d'appel SORTANT autorisées (pare-feu anti-fraude) — alignées sur
 * la whitelist du profil Telnyx : France, DOM, Belgique, Suisse, Luxembourg.
 */
const ALLOWED_PREFIXES = ['+33', '+590', '+596', '+594', '+262', '+32', '+41', '+352'];
export function destinationAllowed(e164: string): boolean {
  return ALLOWED_PREFIXES.some((p) => e164.startsWith(p));
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
