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
        await this.telnyx.answer(callControlId);
        break;
      }

      case 'call.answered': {
        const call = this.db.findCallByProviderId(callControlId);
        // ⚠️ Ne traiter QUE les appels entrants qu'on gère. Sinon, quand un appel
        // SORTANT est décroché, on jouait le répondeur par-dessus (bug du "ça
        // bascule sur mon répondeur"). Si pas de fiche d'appel -> on ignore.
        if (!call || call.direction !== 'inbound') break;
        const settings = call?.phoneNumber?.settings;
        const schedule: WeeklySchedule = settings?.weeklySchedule
          ? safeJson(settings.weeklySchedule, DEFAULT_SCHEDULE)
          : DEFAULT_SCHEDULE;
        const holidays: string[] = settings?.holidays ? safeJson(settings.holidays, []) : [];

        if (isOpen(schedule, holidays)) {
          if (settings?.forwardToMobile && settings.forwardNumber) {
            // Présente le numéro pro (DID appelé) comme caller ID du renvoi.
            await this.telnyx.transferToPstn(callControlId, settings.forwardNumber, call?.toE164);
            this.updateByProvider(callControlId, { status: 'forwarded' });
          } else {
            await this.telnyx.transferToUser(callControlId, 'demo-user');
            this.updateByProvider(callControlId, {
              status: 'answered',
              answeredAt: new Date().toISOString(),
            });
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

function safeJson<T>(s: string, fallback: T): T {
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}
