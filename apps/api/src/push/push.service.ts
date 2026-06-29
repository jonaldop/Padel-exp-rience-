import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';

/**
 * Envoi de notifications push (alertes) via le service Expo Push.
 * Pas de clé : on envoie au endpoint Expo avec les ExpoPushToken des appareils.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly db: DbService) {}

  /** Notifie tous les appareils d'un compte. Best-effort, ne lève jamais. */
  async notifyAccount(
    accountId: string,
    payload: { title: string; body: string; data?: Record<string, any> },
  ): Promise<void> {
    try {
      const tokens = this.db
        .devicesForAccount(accountId)
        .filter((t) => t && t.startsWith('ExponentPushToken'));
      if (!tokens.length) return;

      const messages = tokens.map((to) => ({
        to,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        priority: 'high',
        data: payload.data || {},
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        this.logger.warn(`Expo push ${res.status}: ${await res.text()}`);
      }
    } catch (e) {
      this.logger.warn(`Push non envoyé: ${(e as Error).message}`);
    }
  }
}
