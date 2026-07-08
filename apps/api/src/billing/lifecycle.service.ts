import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { PushService } from '../push/push.service';

const DAY = 86400000;

/**
 * CYCLE DE VIE des abonnements — balayage périodique (toutes les 6 h) :
 *
 * RÉSILIATION : la ligne reste active jusqu'à la fin de la période payée
 * (cancelEffectiveAt), puis le compte passe « canceled » (ligne coupée) et
 * le numéro est LIBÉRÉ chez Telnyx 15 jours plus tard (délai de grâce si le
 * client revient).
 *
 * IMPAYÉ : à l'échec du prélèvement le compte passe « past_due »
 * (pastDueSince). La ligne fonctionne 10 jours (délai de grâce, coupure
 * calculée par lineBlockedReason), puis le numéro est libéré à J+30 si rien
 * n'est régularisé. Un paiement réussi remet tout à zéro (stripe.service).
 */
@Injectable()
export class LifecycleService implements OnModuleInit {
  private readonly logger = new Logger(LifecycleService.name);

  constructor(
    private readonly db: DbService,
    private readonly telnyx: TelnyxService,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    // Premier passage peu après le démarrage, puis toutes les 6 h.
    setTimeout(() => this.sweep().catch(() => {}), 30_000);
    setInterval(() => this.sweep().catch((e) => this.logger.error(`sweep: ${e.message}`)), 6 * 3600 * 1000);
  }

  async sweep(): Promise<void> {
    const now = Date.now();
    for (const a of this.db.allAccounts()) {
      // 1) Résiliation arrivée à échéance -> ligne coupée, numéro gardé 15 j.
      if (
        a.cancelEffectiveAt &&
        a.status !== 'canceled' &&
        new Date(a.cancelEffectiveAt).getTime() <= now
      ) {
        this.db.setAccountLifecycle(a.id, {
          status: 'canceled',
          numbersReleaseAt: a.numbersReleaseAt || new Date(now + 15 * DAY).toISOString(),
        });
        this.logger.log(`Résiliation effective : compte ${a.id} (numéro conservé 15 j)`);
        this.push.notifyAccount(a.id, {
          title: 'Abonnement résilié',
          body: 'Votre ligne est désactivée. Votre numéro reste réservé 15 jours : réabonnez-vous sur allojoe.fr pour le récupérer.',
        });
      }

      // 2) Impayé au-delà du délai de grâce -> programmation de la libération à J+30.
      if (a.status === 'past_due' && a.pastDueSince && !a.numbersReleaseAt) {
        const since = new Date(a.pastDueSince).getTime();
        if (now - since >= 10 * DAY) {
          this.db.setAccountLifecycle(a.id, {
            numbersReleaseAt: new Date(since + 30 * DAY).toISOString(),
          });
          this.logger.warn(`Impayé > 10 j : ligne ${a.id} suspendue, libération du numéro à J+30`);
          this.push.notifyAccount(a.id, {
            title: '🚫 Ligne suspendue — paiement en attente',
            body: 'Votre prélèvement a échoué depuis plus de 10 jours : votre ligne est suspendue. Régularisez sur allojoe.fr pour la réactiver — votre numéro sera libéré définitivement à J+30.',
          });
        }
      }

      // 3) Libération des numéros (résiliation +15 j / impayé +30 j).
      if (
        a.numbersReleaseAt &&
        new Date(a.numbersReleaseAt).getTime() <= now &&
        (a.status === 'canceled' || a.status === 'past_due' || a.status === 'suspended')
      ) {
        const numbers = this.db.releaseAccountNumbers(a.id);
        for (const n of numbers) {
          if (n.providerNumberId) {
            try {
              await this.telnyx.releaseNumber(n.providerNumberId);
            } catch {
              /* déjà libéré ou API indisponible : le retrait local suffit */
            }
          }
        }
        this.db.setAccountLifecycle(a.id, { numbersReleaseAt: null });
        if (numbers.length) {
          this.logger.log(
            `Numéros libérés (${numbers.map((n) => n.e164).join(', ')}) — compte ${a.id}`,
          );
        }
      }
    }
  }
}
