import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { config } from '../config/config';

/**
 * Accès à l'API Telnyx V2 — compte maître unique du SaaS.
 *
 * AUTO-PROVISIONING : avec juste TELNYX_API_KEY configurée, le service crée
 * automatiquement (et réutilise) :
 *   - une "Call Control Application" pointant son webhook vers notre /calls/webhook,
 *   - une "Credential Connection" pour le softphone WebRTC.
 * Plus aucune config manuelle dans le dashboard Telnyx n'est nécessaire.
 *
 * Mode dégradé : sans clé, lecture = données de démo, actions = erreur claire.
 */
@Injectable()
export class TelnyxService {
  private readonly logger = new Logger(TelnyxService.name);
  private callControlAppId?: string;
  private credentialConnectionId?: string;

  get configured() {
    return config.telnyx.configured;
  }

  private async api<T = any>(
    pathname: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Telnyx non configuré (TELNYX_API_KEY manquante).');
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

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // ── Auto-provisioning ──────────────────────────────────────────────────────

  /** Retourne (en la créant si besoin) l'ID de notre Call Control Application. */
  private async ensureCallControlApp(): Promise<string> {
    if (config.telnyx.callControlAppId) return config.telnyx.callControlAppId;
    if (this.callControlAppId) return this.callControlAppId;

    const webhook = `${config.publicApiUrl}/calls/webhook`;
    const list = await this.api<{ data: any[] }>('/call_control_applications?page[size]=250');
    let app = list.data?.find((a) => a.application_name === 'standard-pro');

    if (!app) {
      const created = await this.api<{ data: any }>('/call_control_applications', {
        method: 'POST',
        body: { application_name: 'standard-pro', webhook_event_url: webhook },
      });
      app = created.data;
      this.logger.log(`Call Control Application créée: ${app.id}`);
    } else if (app.webhook_event_url !== webhook) {
      await this.api(`/call_control_applications/${app.id}`, {
        method: 'PATCH',
        body: { webhook_event_url: webhook },
      });
      this.logger.log(`Webhook Call Control mis à jour vers ${webhook}`);
    }
    this.callControlAppId = app.id;
    return app.id;
  }

  /** Retourne (en la créant si besoin) l'ID de notre Credential Connection (WebRTC). */
  private async ensureCredentialConnection(): Promise<string> {
    if (config.telnyx.connectionId) return config.telnyx.connectionId;
    if (this.credentialConnectionId) return this.credentialConnectionId;

    const list = await this.api<{ data: any[] }>('/credential_connections?page[size]=250');
    let conn = list.data?.find((c) => c.connection_name === 'standard-pro-webrtc');
    if (!conn) {
      const created = await this.api<{ data: any }>('/credential_connections', {
        method: 'POST',
        body: { connection_name: 'standard-pro-webrtc', webhook_event_url: `${config.publicApiUrl}/calls/webhook` },
      });
      conn = created.data;
      this.logger.log(`Credential Connection créée: ${conn.id}`);
    }
    this.credentialConnectionId = conn.id;
    return conn.id;
  }

  // ── Provisioning de numéros ────────────────────────────────────────────────

  async searchAvailableNumbers(
    opts: { country?: string; type?: string; contains?: string; limit?: number } = {},
  ) {
    if (!this.configured) {
      const demo = [
        { e164: '+33186000010', type: 'geographic', monthlyCost: 1 },
        { e164: '+33186000011', type: 'geographic', monthlyCost: 1 },
        { e164: '+33756000020', type: 'mobile', monthlyCost: 1 },
        { e164: '+33970000030', type: 'non_geo', monthlyCost: 1 },
      ];
      return demo.filter(
        (n) =>
          (!opts.type || n.type === opts.type) &&
          (!opts.contains || n.e164.includes(opts.contains)),
      );
    }
    // Telnyx : local = géographique (01-05), mobile = 06/07, national = 09
    const typeMap: Record<string, string> = {
      geographic: 'local',
      mobile: 'mobile',
      non_geo: 'national',
    };
    const params = new URLSearchParams();
    params.set('filter[country_code]', opts.country || 'FR');
    params.set('filter[features][]', 'voice');
    params.set('filter[limit]', String(opts.limit || 20));
    if (opts.type && typeMap[opts.type]) params.set('filter[phone_number_type]', typeMap[opts.type]);
    if (opts.contains) params.set('filter[phone_number][contains]', opts.contains.replace(/\D/g, ''));

    const data = await this.api<{ data: any[] }>(`/available_phone_numbers?${params}`);
    const label: Record<string, string> = {
      local: 'géographique',
      mobile: 'mobile',
      national: 'national',
      toll_free: 'gratuit',
    };
    return (data.data || []).map((n) => ({
      e164: n.phone_number,
      type: label[n.phone_number_type] || n.phone_number_type || 'géographique',
      monthlyCost: Number(n.cost_information?.monthly_cost || 1),
    }));
  }

  /** Numéros déjà possédés sur le compte Telnyx (pour réimport/sync). */
  async listOwnedNumbers() {
    if (!this.configured) return [];
    const label: Record<string, string> = {
      local: 'géographique',
      mobile: 'mobile',
      national: 'national',
      toll_free: 'gratuit',
    };
    const data = await this.api<{ data: any[] }>('/phone_numbers?page[size]=250');
    return (data.data || []).map((n) => ({
      e164: n.phone_number,
      providerNumberId: n.id,
      type: label[n.phone_number_type] || 'géographique',
    }));
  }

  /** Assigne un numéro existant à notre Call Control App (routage entrant). */
  async routeNumberToApp(providerNumberId: string) {
    const appId = await this.ensureCallControlApp();
    await this.api(`/phone_numbers/${providerNumberId}`, {
      method: 'PATCH',
      body: { connection_id: appId },
    });
  }

  /** Achète un numéro et l'attribue à notre Call Control App (routage entrant). */
  async buyNumber(e164: string): Promise<{ providerNumberId: string | null }> {
    // Idempotent : si le numéro est déjà possédé, l'achat échoue -> on continue
    // quand même pour le retrouver et l'assigner au compte.
    try {
      await this.api('/number_orders', {
        method: 'POST',
        body: { phone_numbers: [{ phone_number: e164 }] },
      });
    } catch (e) {
      this.logger.warn(`Commande ${e164} non passée (peut-être déjà possédé): ${(e as Error).message}`);
    }

    const appId = await this.ensureCallControlApp();

    // Le numéro peut mettre quelques secondes à apparaître dans /phone_numbers.
    let numberId: string | null = null;
    for (let i = 0; i < 6 && !numberId; i++) {
      const found = await this.api<{ data: any[] }>(
        `/phone_numbers?filter[phone_number]=${encodeURIComponent(e164)}`,
      );
      numberId = found.data?.[0]?.id || null;
      if (!numberId) await this.sleep(1500);
    }

    if (numberId) {
      await this.api(`/phone_numbers/${numberId}`, {
        method: 'PATCH',
        body: { connection_id: appId },
      });
      this.logger.log(`Numéro ${e164} acheté et routé vers l'app ${appId}`);
    } else {
      this.logger.warn(`Numéro ${e164} acheté mais id non résolu (assignation à refaire)`);
    }
    return { providerNumberId: numberId };
  }

  // ── WebRTC (softphone) ─────────────────────────────────────────────────────

  async createWebrtcToken(userTag: string): Promise<{ token: string }> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Telnyx non configuré : token WebRTC indisponible');
    }
    const connectionId = await this.ensureCredentialConnection();
    const cred = await this.api<{ data: { id: string } }>('/telephony_credentials', {
      method: 'POST',
      body: { connection_id: connectionId, name: `webrtc-${userTag}` },
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

  transferToUser(callControlId: string, sipUsername: string) {
    return this.api(`/calls/${callControlId}/actions/transfer`, {
      method: 'POST',
      body: { to: `sip:${sipUsername}@sip.telnyx.com` },
    });
  }

  /** Renvoi vers un mobile classique (PSTN). Présente le numéro pro en caller ID. */
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

  /** Appel SORTANT (présente le numéro pro du compte). */
  async dial(to: string, from: string) {
    const appId = await this.ensureCallControlApp();
    return this.api('/calls', {
      method: 'POST',
      body: { to, from, connection_id: appId },
    });
  }
}
