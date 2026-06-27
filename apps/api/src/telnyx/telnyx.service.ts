import { Injectable, Logger } from '@nestjs/common';
import { config } from '../config/config';

/**
 * Service d'accès à l'API Telnyx V2.
 *
 * Deux responsabilités au MVP :
 *  1. Émettre un token WebRTC court pour que le softphone (web/mobile) se connecte
 *     et puisse passer/recevoir des appels (login_token du SDK @telnyx/webrtc).
 *  2. Piloter les appels entrants via la "Call Control API" (répondre, jouer un
 *     message, transférer vers le softphone, enregistrer un message vocal).
 *
 * Note : on isole TOUT l'accès Telnyx ici (cf. doc 02 — module telecom). Le jour
 * où on ajoute Twilio en secours, on crée un autre adaptateur derrière la même
 * interface, sans toucher au reste de l'app.
 */
@Injectable()
export class TelnyxService {
  private readonly logger = new Logger(TelnyxService.name);

  private async api<T = any>(
    pathname: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const res = await fetch(`${config.telnyx.apiBase}${pathname}`, {
      method: init.method || 'GET',
      headers: {
        Authorization: `Bearer ${config.telnyx.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Telnyx ${init.method || 'GET'} ${pathname} -> ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  /**
   * Crée une "telephony credential" rattachée à notre Credential Connection,
   * puis génère un token JWT court utilisable par le SDK WebRTC côté client.
   *
   * En production : on crée UNE credential par utilisateur (réutilisable) et on
   * ne régénère que le token. Ici on fait simple pour la démo.
   */
  async createWebrtcToken(userTag: string): Promise<{ token: string }> {
    // 1) Créer (ou réutiliser) une credential rattachée à la connection WebRTC
    const cred = await this.api<{ data: { id: string } }>('/telephony_credentials', {
      method: 'POST',
      body: {
        connection_id: config.telnyx.connectionId,
        name: `webrtc-${userTag}`,
      },
    });

    // 2) Générer un token court à partir de cette credential
    const tokenRes = await fetch(
      `${config.telnyx.apiBase}/telephony_credentials/${cred.data.id}/token`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.telnyx.apiKey}` },
      },
    );
    if (!tokenRes.ok) {
      throw new Error(`Telnyx token error: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    // L'endpoint renvoie le token en texte brut (JWT)
    const token = (await tokenRes.text()).trim();
    return { token };
  }

  // ── Call Control : actions sur un appel en cours (entrant) ──────────────────

  /** Répondre à un appel entrant. */
  answer(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/answer`, { method: 'POST' });
  }

  /** Jouer un message d'accueil (TTS) — ex. message hors horaires. */
  speak(callControlId: string, text: string) {
    return this.api(`/calls/${callControlId}/actions/speak`, {
      method: 'POST',
      body: { payload: text, voice: 'female', language: 'fr-FR' },
    });
  }

  /**
   * Transférer l'appel vers notre utilisateur softphone (SIP de la credential
   * connection) — c'est ce qui "fait sonner l'app".
   */
  transferToUser(callControlId: string, sipUsername: string) {
    return this.api(`/calls/${callControlId}/actions/transfer`, {
      method: 'POST',
      body: { to: `sip:${sipUsername}@sip.telnyx.com` },
    });
  }

  /** Démarrer l'enregistrement d'un message vocal. */
  recordStart(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/record_start`, {
      method: 'POST',
      body: { format: 'mp3', channels: 'single' },
    });
  }

  /** Raccrocher. */
  hangup(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/hangup`, { method: 'POST' });
  }
}
