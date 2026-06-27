import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
  private outboundProfileId?: string;

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
    const profileId = await this.ensureOutboundVoiceProfile();
    const list = await this.api<{ data: any[] }>('/call_control_applications?page[size]=250');
    let app = list.data?.find((a) => a.application_name === 'standard-pro');

    if (!app) {
      const created = await this.api<{ data: any }>('/call_control_applications', {
        method: 'POST',
        body: {
          application_name: 'standard-pro',
          webhook_event_url: webhook,
          outbound: { outbound_voice_profile_id: profileId },
        },
      });
      app = created.data;
      this.logger.log(`Call Control Application créée: ${app.id}`);
    } else {
      // Maintient le webhook à jour ET attache le profil sortant (pour le renvoi PSTN).
      const patch: any = {};
      if (app.webhook_event_url !== webhook) patch.webhook_event_url = webhook;
      if (!app.outbound?.outbound_voice_profile_id) patch.outbound = { outbound_voice_profile_id: profileId };
      if (Object.keys(patch).length) {
        await this.api(`/call_control_applications/${app.id}`, { method: 'PATCH', body: patch });
        this.logger.log(`Call Control Application mise à jour (${Object.keys(patch).join(', ')})`);
      }
    }
    this.callControlAppId = app.id;
    return app.id;
  }

  /** Profil d'appel sortant (obligatoire pour passer des appels) — créé/réutilisé. */
  private async ensureOutboundVoiceProfile(): Promise<string> {
    if (this.outboundProfileId) return this.outboundProfileId;
    // Destinations autorisées : France (+ DOM utiles). SANS ça, Telnyx rejette TOUT.
    const destinations = ['FR', 'GP', 'MQ', 'RE', 'YT', 'GF', 'BE', 'CH', 'LU'];
    const list = await this.api<{ data: any[] }>('/outbound_voice_profiles?page[size]=250');
    let p = list.data?.find((x) => x.name === 'standard-pro');
    if (!p) {
      const created = await this.api<{ data: any }>('/outbound_voice_profiles', {
        method: 'POST',
        body: {
          name: 'standard-pro',
          traffic_type: 'conversational',
          whitelisted_destinations: destinations,
        },
      });
      p = created.data;
      this.logger.log(`Outbound Voice Profile créé: ${p.id}`);
    } else if (!(p.whitelisted_destinations || []).includes('FR')) {
      // Profil existant sans la France autorisée -> on corrige (cause de CALL_REJECTED)
      await this.api(`/outbound_voice_profiles/${p.id}`, {
        method: 'PATCH',
        body: { whitelisted_destinations: destinations },
      });
      this.logger.log(`Destinations autorisées mises à jour sur le profil ${p.id}`);
    }
    this.outboundProfileId = p.id;
    return p.id;
  }

  /** Retourne (en la créant si besoin) l'ID de notre Credential Connection (WebRTC). */
  private async ensureCredentialConnection(): Promise<string> {
    if (config.telnyx.connectionId) return config.telnyx.connectionId;
    if (this.credentialConnectionId) return this.credentialConnectionId;

    const profileId = await this.ensureOutboundVoiceProfile();
    const list = await this.api<{ data: any[] }>('/credential_connections?page[size]=250');
    let conn = list.data?.find((c) => c.connection_name === 'standard-pro-webrtc');
    if (!conn) {
      const userName = 'sp' + randomUUID().replace(/-/g, '').slice(0, 16);
      const password = 'Sp1' + randomUUID().replace(/-/g, '');
      const created = await this.api<{ data: any }>('/credential_connections', {
        method: 'POST',
        body: {
          connection_name: 'standard-pro-webrtc',
          user_name: userName,
          password,
          webhook_event_url: `${config.publicApiUrl}/calls/webhook`,
          outbound: { outbound_voice_profile_id: profileId },
        },
      });
      conn = created.data;
      this.logger.log(`Credential Connection créée: ${conn.id}`);
    } else if (!conn.outbound?.outbound_voice_profile_id) {
      // Connexion existante sans profil sortant -> on l'attache (corrige "appel raccroché aussitôt")
      await this.api(`/credential_connections/${conn.id}`, {
        method: 'PATCH',
        body: { outbound: { outbound_voice_profile_id: profileId } },
      });
      this.logger.log(`Outbound profile attaché à la connexion ${conn.id}`);
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

  speak(callControlId: string, text: string, voice = 'Polly.Lea-Neural') {
    // Voix Polly (neuronales) : la langue est déduite -> on n'envoie language
    // que pour les voix basiques "male"/"female".
    const body: any = { payload: text, voice };
    if (voice === 'male' || voice === 'female') body.language = 'fr-FR';
    return this.api(`/calls/${callControlId}/actions/speak`, { method: 'POST', body });
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
