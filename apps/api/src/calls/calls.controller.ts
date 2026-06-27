import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { TelnyxService } from '../telnyx/telnyx.service';
import { CallsStore } from './calls.store';
import { isOpen, DEFAULT_SCHEDULE } from './business-hours';

/**
 * Webhook Call Control de Telnyx + lecture de l'historique.
 *
 * Telnyx envoie un événement à chaque étape de l'appel (call.initiated,
 * call.answered, call.hangup, ...). On décide ici quoi faire de l'appel ENTRANT :
 *   - dans les horaires  -> on transfère vers le softphone (l'app sonne)
 *   - hors horaires      -> message d'accueil puis enregistrement (répondeur)
 *
 * Cf. doc 01 §4 (flux entrant) et doc 08 (tickets CALL-2, FLOW-1/3/4).
 */
@Controller('calls')
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  // Horaires en dur pour la démo — viendront de la DB par numéro (doc 04).
  private readonly schedule = DEFAULT_SCHEDULE;

  constructor(
    private readonly telnyx: TelnyxService,
    private readonly store: CallsStore,
  ) {}

  /** Historique pour le dashboard / softphone. */
  @Get()
  list() {
    return this.store.list();
  }

  /** Webhook appelé par Telnyx (à configurer sur la Call Control Application). */
  @Post('webhook')
  async webhook(@Body() body: any) {
    const event = body?.data;
    if (!event) return { ok: true };

    const type: string = event.event_type;
    const payload = event.payload || {};
    const callControlId: string = payload.call_control_id;

    this.logger.log(`Webhook reçu: ${type} (${callControlId})`);

    switch (type) {
      case 'call.initiated': {
        // Seuls les appels ENTRANTS sont routés ici.
        if (payload.direction !== 'incoming') break;

        this.store.upsert({
          id: callControlId,
          direction: 'inbound',
          from: payload.from,
          to: payload.to,
          status: 'ringing',
          startedAt: new Date().toISOString(),
        });

        await this.telnyx.answer(callControlId);
        break;
      }

      case 'call.answered': {
        if (isOpen(this.schedule)) {
          // Ouvert -> on fait sonner le softphone de l'utilisateur.
          // 'demo-user' = nom de la credential créée pour le softphone web.
          this.store.upsert({ id: callControlId, status: 'answered' });
          await this.telnyx.transferToUser(callControlId, 'demo-user');
        } else {
          // Fermé -> message d'accueil + répondeur.
          this.store.upsert({ id: callControlId, status: 'voicemail' });
          await this.telnyx.speak(
            callControlId,
            "Bonjour, vous êtes bien chez nous. Nos bureaux sont actuellement fermés. " +
              'Laissez votre message après le bip, nous vous rappellerons.',
          );
          await this.telnyx.recordStart(callControlId);
        }
        break;
      }

      case 'call.recording.saved': {
        // Le message vocal est prêt (URL fournie par Telnyx) -> à stocker en S3
        // et transcrire (ticket AI-1). Pour l'instant on logue l'URL.
        this.logger.log(`Voicemail enregistré: ${payload.recording_urls?.mp3}`);
        break;
      }

      case 'call.hangup': {
        const startedAt = this.store
          .list()
          .find((c) => c.id === callControlId)?.startedAt;
        const durationS = startedAt
          ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
          : undefined;
        this.store.upsert({
          id: callControlId,
          status: 'completed',
          endedAt: new Date().toISOString(),
          durationS,
        });
        break;
      }

      default:
        break;
    }

    return { ok: true };
  }
}
