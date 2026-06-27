import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../config/config';

/**
 * Service d'accès à l'API Telnyx V2 — c'est NOTRE compte maître (un seul pour
 * tout le SaaS). Le client final ne connaît jamais Telnyx : notre back-end
 * provisionne les numéros et pilote les appels pour son compte.
 *
 * Mode dégradé : si TELNYX_API_KEY n'est pas configurée, les méthodes de
 * lecture renvoient des données de démo et les actions lèvent une erreur claire.
 * Ça permet de faire tourner / tester l'app sans compte Telnyx.
 *
 * On isole TOUT l'accès Telnyx ici (cf. docs/02 — module telecom). Ajouter
 * Twilio en secours = un autre adaptateur derrière la même interface.
 */
@Injectable()
export class TelnyxService {
  private readonly logger = new Logger(TelnyxService.name);

  get configured() {
    return config.telnyx.configured;
  }

  private async api<T = any>(
    pathname: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Telnyx non configuré (TELNYX_API_KEY manquante). Voir docs/DEV.md',
      );
    }
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
      this.logger.error(`Telnyx ${init.method || 'GET'} ${pathname} -> ${res.status}: ${text}`);
      throw new Error(`Telnyx ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  // ── Provisioning de numéros ────────────────────────────────────────────────

  /** Recherche des numéros FR disponibles à l'achat. */
  async searchAvailableNumbers(opts: { country?: string; type?: string; limit?: number } = {}) {
    if (!this.configured) {
      // Démo : faux numéros pour pouvoir tester l'UI sans Telnyx.
      return [
        { e164: '+33756000001', type: 'mobile', monthlyCost: 1 },
        { e164: '+33186000002', type: 'geographic', monthlyCost: 1 },
        { e164: '+33970000003', type: 'non_geo', monthlyCost: 1 },
      ];
    }
    const country = opts.country || 'FR';
    const params = new URLSearchParams({
      'filter[country_code]': country,
      'filter[limit]': String(opts.limit || 10),
    });
    const data = await this.api<{ data: any[] }>(`/available_phone_numbers?${params}`);
    return data.data.map((n) => ({
      e164: n.phone_number,
      type: n.phone_number_type || 'geographic',
      monthlyCost: Number(n.cost_information?.monthly_cost || 1),
    }));
  }

  /** Achète un numéro et le rattache à notre Call Control App (routage entrant). */
  async buyNumber(e164: string): Promise<{ providerNumberId: string }> {
    const order = await this.api<{ data: { id: string; phone_numbers: any[] } }>(
      '/number_orders',
      { method: 'POST', body: { phone_numbers: [{ phone_number: e164 }] } },
    );
    const providerNumberId = order.data.phone_numbers?.[0]?.id || order.data.id;

    // Associer le numéro à la Call Control Application pour router les entrants.
    if (config.telnyx.callControlAppId && providerNumberId) {
      try {
        await this.api(`/phone_numbers/${providerNumberId}`, {
          method: 'PATCH',
          body: { connection_id: config.telnyx.callControlAppId },
        });
      } catch (e) {
        this.logger.warn(`Association Call Control échouée: ${(e as Error).message}`);
      }
    }
    return { providerNumberId };
  }

  // ── WebRTC (softphone) ─────────────────────────────────────────────────────

  async createWebrtcToken(userTag: string): Promise<{ token: string }> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Telnyx non configuré : impossible de générer un token WebRTC');
    }
    const cred = await this.api<{ data: { id: string } }>('/telephony_credentials', {
      method: 'POST',
      body: { connection_id: config.telnyx.connectionId, name: `webrtc-${userTag}` },
    });
    const tokenRes = await fetch(
      `${config.telnyx.apiBase}/telephony_credentials/${cred.data.id}/token`,
      { method: 'POST', headers: { Authorization: `Bearer ${config.telnyx.apiKey}` } },
    );
    if (!tokenRes.ok) {
      throw new Error(`Telnyx token error: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    return { token: (await tokenRes.text()).trim() };
  }

  // ── Call Control : actions sur un appel en cours ───────────────────────────

  answer(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/answer`, { method: 'POST' });
  }

  speak(callControlId: string, text: string) {
    return this.api(`/calls/${callControlId}/actions/speak`, {
      method: 'POST',
      body: { payload: text, voice: 'female', language: 'fr-FR' },
    });
  }

  /** Transfère vers le softphone de l'utilisateur (fait sonner l'app). */
  transferToUser(callControlId: string, sipUsername: string) {
    return this.api(`/calls/${callControlId}/actions/transfer`, {
      method: 'POST',
      body: { to: `sip:${sipUsername}@sip.telnyx.com` },
    });
  }

  /**
   * Renvoi vers un mobile classique (PSTN). On présente le numéro pro (le DID
   * appelé) comme caller ID, sinon le numéro pro du compte par défaut.
   */
  transferToPstn(callControlId: string, to: string, from?: string) {
    return this.api(`/calls/${callControlId}/actions/transfer`, {
      method: 'POST',
      body: { to, from: from || config.telnyx.fromNumber },
    });
  }

  recordStart(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/record_start`, {
      method: 'POST',
      body: { format: 'mp3', channels: 'single' },
    });
  }

  hangup(callControlId: string) {
    return this.api(`/calls/${callControlId}/actions/hangup`, { method: 'POST' });
  }

  /** Lance un appel SORTANT (présente le numéro pro du compte). */
  dial(to: string, from: string) {
    return this.api('/calls', {
      method: 'POST',
      body: {
        to,
        from,
        connection_id: config.telnyx.callControlAppId,
      },
    });
  }
}
