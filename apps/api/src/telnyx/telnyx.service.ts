import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
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
          // Réception entrante vers le client WebRTC enregistré (sinon 403).
          inbound: { dnis_number_format: 'sip_username' },
          sip_uri_calling_preference: 'internal',
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

  /**
   * Enregistre le certificat VoIP Push (iOS) dans Telnyx et l'attache à notre
   * connexion WebRTC -> permet de SONNER l'app sur appel entrant (PushKit).
   * Idempotent : réutilise/écrase le credential push nommé 'standard-pro-ios'.
   */
  async setupIosPush(certificate: string, privateKey: string): Promise<{ id: string }> {
    const connId = await this.ensureCredentialConnection();
    const alias = 'standard-pro-ios';

    // Supprime un éventuel ancien credential du même alias (renouvellement de cert).
    try {
      const existing = await this.api<{ data: any[] }>('/mobile_push_credentials?page[size]=250');
      for (const c of existing.data || []) {
        if (c.alias === alias) {
          await this.api(`/mobile_push_credentials/${c.id}`, { method: 'DELETE' });
        }
      }
    } catch {
      /* pas bloquant */
    }

    const created = await this.api<{ data: { id: string } }>('/mobile_push_credentials', {
      method: 'POST',
      body: { type: 'ios', alias, certificate, private_key: privateKey },
    });
    const id = created.data.id;

    // Attache le credential push à la connexion WebRTC (appels entrants -> push).
    await this.api(`/credential_connections/${connId}`, {
      method: 'PATCH',
      body: { ios_push_credential_id: id },
    });
    this.logger.log(`Push iOS configuré (${id}) sur la connexion ${connId}`);
    return { id };
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
      // customer_reference = ID du compte propriétaire chez nous (multi-tenant).
      ownerRef: n.customer_reference || '',
    }));
  }

  /** Étiquette un numéro avec le compte propriétaire (customer_reference). */
  async tagNumberOwner(providerNumberId: string, accountId: string) {
    if (!this.configured || !providerNumberId || !accountId) return;
    try {
      await this.api(`/phone_numbers/${providerNumberId}`, {
        method: 'PATCH',
        body: { customer_reference: accountId },
      });
    } catch (e) {
      this.logger.warn(`Tag propriétaire échoué pour ${providerNumberId}: ${(e as Error).message}`);
    }
  }

  /** Statut réel d'un numéro chez Telnyx (active / pending requirements...). */
  async getNumberStatus(providerNumberId: string): Promise<{ status: string } | null> {
    if (!this.configured || !providerNumberId) return null;
    try {
      const data = await this.api<{ data: any }>(`/phone_numbers/${providerNumberId}`);
      return { status: data.data?.status || 'unknown' };
    } catch {
      return null;
    }
  }

  /** Assigne un numéro existant à notre Call Control App (routage entrant). */
  async routeNumberToApp(providerNumberId: string, accountId?: string) {
    const appId = await this.ensureCallControlApp();
    const body: any = { connection_id: appId };
    // On étiquette aussi le compte propriétaire (multi-tenant).
    if (accountId) body.customer_reference = accountId;
    await this.api(`/phone_numbers/${providerNumberId}`, {
      method: 'PATCH',
      body,
    });
  }

  /** Achète un numéro et l'attribue à notre Call Control App (routage entrant). */
  async buyNumber(e164: string, accountId?: string): Promise<{ providerNumberId: string | null }> {
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
      const body: any = { connection_id: appId };
      // Étiquette le compte propriétaire pour isoler les tenants.
      if (accountId) body.customer_reference = accountId;
      await this.api(`/phone_numbers/${numberId}`, {
        method: 'PATCH',
        body,
      });
      this.logger.log(`Numéro ${e164} acheté et routé vers l'app ${appId}`);
    } else {
      this.logger.warn(`Numéro ${e164} acheté mais id non résolu (assignation à refaire)`);
    }
    return { providerNumberId: numberId };
  }

  // ── WebRTC (softphone) ─────────────────────────────────────────────────────

  /**
   * Identifiant WebRTC STABLE par compte (réutilisé, pas recréé à chaque fois).
   * On a besoin que son `sip_username` soit fixe pour pouvoir router les appels
   * entrants vers le bon client (cf. getAccountSipUser).
   */
  private async ensureTelephonyCredential(tag: string): Promise<{ id: string; sipUsername: string | null }> {
    const connectionId = await this.ensureCredentialConnection();
    const name = `webrtc-${tag}`;
    const list = await this.api<{ data: any[] }>('/telephony_credentials?page[size]=250');
    let cred = list.data?.find((c) => c.name === name);
    if (!cred) {
      const created = await this.api<{ data: any }>('/telephony_credentials', {
        method: 'POST',
        body: { connection_id: connectionId, name },
      });
      cred = created.data;
    }
    return { id: cred.id, sipUsername: cred.sip_username || null };
  }

  /**
   * Identifiants de connexion (login + mot de passe) pour la réception d'appels
   * ENTRANTS en WebRTC. Contrairement aux "telephony credentials" jetables (qui
   * ne reçoivent PAS d'appels entrants chez Telnyx), la connexion elle-même est
   * joignable via sip:<user_name>@sip.telnyx.com.
   *
   * Le mot de passe est déterministe (dérivé d'un secret) et (re)posé sur la
   * connexion, pour qu'on puisse le redonner à l'app sans le stocker.
   */
  private webrtcCreds?: { login: string; password: string };
  async ensureWebrtcCredentials(): Promise<{ login: string; password: string }> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Telnyx non configuré');
    }
    if (this.webrtcCreds) return this.webrtcCreds;
    const connId = await this.ensureCredentialConnection();
    const conn = await this.api<{ data: any }>(`/credential_connections/${connId}`);
    const login = conn.data?.user_name;
    const password = 'Sp' + createHash('sha256').update(config.jwtSecret + connId).digest('hex').slice(0, 24);
    // (Re)pose le mot de passe connu sur la connexion.
    await this.api(`/credential_connections/${connId}`, { method: 'PATCH', body: { password } });
    // INDISPENSABLE pour la réception entrante : route l'appel vers le client
    // enregistré par son SIP username (sinon Telnyx renvoie 403). (Support Telnyx)
    try {
      await this.api(`/credential_connections/${connId}`, {
        method: 'PATCH',
        body: { inbound: { dnis_number_format: 'sip_username' }, sip_uri_calling_preference: 'internal' },
      });
    } catch (e) {
      this.logger.warn(`Réglage réception (sip_username/internal) non appliqué: ${(e as Error).message}`);
    }
    this.webrtcCreds = { login, password };
    this.logger.log('Identifiants WebRTC (connexion) prêts pour la réception entrante');
    return this.webrtcCreds;
  }

  async createWebrtcToken(tag: string): Promise<{ token: string }> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Telnyx non configuré : token WebRTC indisponible');
    }
    const cred = await this.ensureTelephonyCredential(tag);
    const tokenRes = await fetch(
      `${config.telnyx.apiBase}/telephony_credentials/${cred.id}/token`,
      { method: 'POST', headers: { Authorization: `Bearer ${config.telnyx.apiKey}` } },
    );
    if (!tokenRes.ok) {
      throw new Error(`Telnyx token error: ${tokenRes.status} ${await tokenRes.text()}`);
    }
    return { token: (await tokenRes.text()).trim() };
  }

  /** Nom SIP du client WebRTC d'un compte (cible des appels entrants in-app). */
  async getAccountSipUser(accountId: string): Promise<string | null> {
    if (!this.configured) return null;
    try {
      const cred = await this.ensureTelephonyCredential(accountId);
      return cred.sipUsername;
    } catch {
      return null;
    }
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

  transferToUser(callControlId: string, sipUsername: string, timeoutSecs?: number) {
    const body: any = { to: `sip:${sipUsername}@sip.telnyx.com` };
    if (timeoutSecs) body.timeout_secs = timeoutSecs;
    return this.api(`/calls/${callControlId}/actions/transfer`, { method: 'POST', body });
  }

  /**
   * Pose le réglage Inbound (réception vers le client WebRTC enregistré) et
   * renvoie la config inbound réelle de la connexion + le résultat du PATCH.
   * Sert à appliquer + diagnostiquer le fix du 403 à la demande.
   */
  async configureInbound(): Promise<any> {
    if (!this.configured) return { error: 'Telnyx non configuré' };
    const connId = await this.ensureCredentialConnection();
    const attempts: any[] = [];
    // 1) Format de destination = SIP username (route vers le client enregistré).
    // 2) sip_uri_calling_preference = internal (autorise le transfert SIP entre
    //    connexions du même compte). Les DEUX sont nécessaires (support Telnyx).
    try {
      await this.api(`/credential_connections/${connId}`, {
        method: 'PATCH',
        body: { inbound: { dnis_number_format: 'sip_username' }, sip_uri_calling_preference: 'internal' },
      });
      attempts.push({ ok: true });
    } catch (e) {
      attempts.push({ error: (e as Error).message });
    }
    const conn = await this.api<{ data: any }>(`/credential_connections/${connId}`);
    return {
      connId,
      userName: conn.data?.user_name,
      sip_uri_calling_preference: conn.data?.sip_uri_calling_preference,
      inbound: conn.data?.inbound,
      attempts,
    };
  }

  /** Solde / crédit du compte Telnyx (forfait). */
  async getBalance(): Promise<{ balance: string; currency: string; creditLimit: string } | null> {
    if (!this.configured) return null;
    try {
      const data = await this.api<{ data: any }>('/balance');
      return {
        balance: data.data?.balance ?? data.data?.available_credit ?? '0',
        currency: data.data?.currency ?? 'USD',
        creditLimit: data.data?.credit_limit ?? '0',
      };
    } catch {
      return null;
    }
  }

  /** Nom d'utilisateur SIP de notre connexion WebRTC (cible des appels entrants in-app). */
  async getCredentialSipUser(): Promise<string | null> {
    if (!this.configured) return null;
    try {
      const id = await this.ensureCredentialConnection();
      const data = await this.api<{ data: any }>(`/credential_connections/${id}`);
      return data.data?.user_name || null;
    } catch {
      return null;
    }
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
