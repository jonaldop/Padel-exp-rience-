import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { config } from '../config/config';

/**
 * Back-office propriétaire du SaaS : voir tous les comptes clients.
 *
 * Authentification par LOGIN + MOT DE PASSE (compte propriétaire défini via
 * ADMIN_EMAIL / ADMIN_PASSWORD). On émet un JWT marqué `admin: true`.
 * (L'ancienne clé ADMIN_KEY reste acceptée en repli pour compatibilité.)
 */
@Controller('admin')
export class AdminController {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
    private readonly telnyx: TelnyxService,
  ) {}

  /** Connexion admin : renvoie un token si email + mot de passe corrects. */
  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (email !== config.admin.email || password !== config.admin.password) {
      throw new UnauthorizedException('Identifiants admin invalides');
    }
    const token = this.jwt.sign({ admin: true, email }, { expiresIn: '12h' });
    return { token, email };
  }

  @Get('accounts')
  accounts(
    @Headers('authorization') authorization: string,
    @Query('key') key: string,
    @Headers('x-admin-key') headerKey: string,
  ) {
    this.authorize(authorization, key || headerKey);
    const accounts = this.db.adminListAccounts(config.costPerMinute);
    return { count: accounts.length, accounts };
  }

  /** Tableau de bord : synthèse + solde Telnyx. */
  @Get('dashboard')
  async dashboard(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    const summary = this.db.adminSummary(config.costPerMinute);
    const telnyx = await this.telnyx.getBalance();
    return { summary, telnyx, costPerMinute: config.costPerMinute };
  }

  /** Applique + diagnostique le réglage Inbound (fix 403 réception WebRTC). */
  @Post('fix-inbound')
  async fixInbound(@Headers('authorization') authorization: string) {
    this.authorize(authorization);
    try {
      return await this.telnyx.configureInbound();
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  /** Diagnostic : décisions de routage des derniers appels entrants. */
  @Get('debug-calls')
  debugCalls(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    return { events: this.db.getInboundLog() };
  }

  // ── Actions sur les comptes clients ─────────────────────────────────────────

  /** Fiche client détaillée : conso, derniers appels, notes internes, factures. */
  @Get('accounts/:id/detail')
  accountDetail(@Headers('authorization') authorization: string, @Param('id') id: string) {
    this.authorize(authorization);
    return {
      usage: this.db.accountUsage(id, config.costPerMinute),
      calls: this.db.listCalls(id).slice(0, 20),
      notes: this.db.listAdminNotes(id),
      invoices: this.db.listInvoices(id),
    };
  }

  /**
   * Période d'essai d'un compte, modulable :
   * - { days: 15 }        -> prolonge de 15 jours (depuis maintenant ou la fin actuelle) ;
   * - { until: '2026-08-01' } -> fixe une date de fin précise ;
   * - { unlimited: true } -> essai ILLIMITÉ.
   */
  @Patch('accounts/:id/trial')
  accountTrial(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { days?: number; until?: string; unlimited?: boolean },
  ) {
    this.authorize(authorization);
    let endsAt: string | null;
    if (body.unlimited) {
      endsAt = null;
    } else if (body.until) {
      const d = new Date(body.until);
      if (isNaN(d.getTime())) return { error: 'Date invalide' };
      endsAt = d.toISOString();
    } else if (body.days && body.days > 0) {
      // Prolonge depuis la fin actuelle si elle est dans le futur, sinon depuis maintenant.
      const a = this.db.accountUsage(id, config.costPerMinute);
      const base = a?.trial?.endsAt && new Date(a.trial.endsAt) > new Date()
        ? new Date(a.trial.endsAt)
        : new Date();
      endsAt = new Date(base.getTime() + body.days * 86400000).toISOString();
    } else {
      return { error: 'Précisez days, until ou unlimited' };
    }
    const acc = this.db.setTrial(id, endsAt);
    return acc ? { ok: true, trial: this.db.trialInfo(acc) } : { error: 'Compte introuvable' };
  }

  /** Remise permanente (%) sur la formule d'un compte (0 = retirer). */
  @Patch('accounts/:id/discount')
  accountDiscount(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { discountPct?: number },
  ) {
    this.authorize(authorization);
    const pct = Number(body.discountPct);
    if (isNaN(pct) || pct < 0 || pct > 100) return { error: 'Remise invalide (0-100)' };
    const a = this.db.setDiscount(id, pct);
    return a ? { ok: true, discountPct: a.discountPct, prixEffectif: this.db.effectivePrice(a) } : { error: 'Compte introuvable' };
  }

  /** Marquer une facture payée / à payer / annulée. */
  @Patch('invoices/:id')
  invoiceStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { status?: 'due' | 'paid' | 'void' },
  ) {
    this.authorize(authorization);
    if (!body.status || !['due', 'paid', 'void'].includes(body.status)) {
      return { error: 'Statut invalide (due, paid, void)' };
    }
    const i = this.db.setInvoiceStatus(id, body.status);
    return i ? { ok: true, invoice: i } : { error: 'Facture introuvable' };
  }

  /** Changer le statut d'un compte (suspension réelle : bloque la connexion). */
  @Patch('accounts/:id/status')
  accountStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { status?: string },
  ) {
    this.authorize(authorization);
    const allowed = ['active', 'trial', 'past_due', 'suspended', 'canceled'];
    if (!body.status || !allowed.includes(body.status)) {
      return { error: `Statut invalide (${allowed.join(', ')})` };
    }
    const a = this.db.updateAccountStatus(id, body.status);
    return a ? { ok: true, status: a.status } : { error: 'Compte introuvable' };
  }

  /** Changer la formule d'un compte (geste commercial / correction). */
  @Patch('accounts/:id/plan')
  accountPlan(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { plan?: string },
  ) {
    this.authorize(authorization);
    const allowed = this.db.listPlans().map((p) => p.key);
    if (!body.plan || !allowed.includes(body.plan)) {
      return { error: `Formule inconnue (${allowed.join(', ')})` };
    }
    const a = this.db.updateAccountPlan(id, body.plan);
    return a ? { ok: true, plan: a.plan } : { error: 'Compte introuvable' };
  }

  /** Réinitialiser le mot de passe d'un utilisateur du compte (support). */
  @Post('accounts/:id/reset-password')
  async accountResetPassword(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { email?: string; newPassword?: string },
  ) {
    this.authorize(authorization);
    const user = this.db.findUserByEmail(body.email || '');
    if (!user || user.accountId !== id) return { error: 'Utilisateur introuvable sur ce compte' };
    // Mot de passe fourni, ou généré (communiqué à l'admin une seule fois).
    const newPassword =
      (body.newPassword || '').trim() || 'Joe-' + Math.random().toString(36).slice(2, 10);
    if (newPassword.length < 8) return { error: 'Mot de passe trop court (8 caractères minimum)' };
    const hash = await bcrypt.hash(newPassword, 10);
    this.db.setUserPassword(user.id, hash);
    return { ok: true, email: user.email, newPassword };
  }

  /** Notes internes : ajouter. */
  @Post('accounts/:id/notes')
  addNote(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: { text?: string },
  ) {
    this.authorize(authorization);
    const text = (body.text || '').trim();
    if (!text) return { error: 'Note vide' };
    return this.db.addAdminNote(id, text);
  }

  /** Notes internes : supprimer. */
  @Delete('notes/:noteId')
  deleteNote(@Headers('authorization') authorization: string, @Param('noteId') noteId: string) {
    this.authorize(authorization);
    return { deleted: this.db.deleteAdminNote(noteId) };
  }

  /** Formules : lister. */
  @Get('plans')
  plans(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    return { plans: this.db.listPlans() };
  }

  /** Formules : créer / modifier. */
  @Patch('plans')
  upsertPlan(
    @Headers('authorization') authorization: string,
    @Body() body: { key: string; name?: string; monthlyPrice?: number; includedMinutes?: number; features?: string[]; active?: boolean },
  ) {
    this.authorize(authorization);
    if (!body.key) return { error: 'Clé de formule requise' };
    return this.db.upsertPlan(body);
  }

  /** Formules : supprimer. */
  @Delete('plans/:key')
  deletePlan(@Headers('authorization') authorization: string, @Param('key') key: string) {
    this.authorize(authorization);
    return { deleted: this.db.deletePlan(key) };
  }

  /** Configure le push VoIP iOS (certificat APNs) dans Telnyx. */
  @Post('ios-push')
  async iosPush(
    @Headers('authorization') authorization: string,
    @Body() body: { certificate?: string; privateKey?: string },
  ) {
    this.authorize(authorization);
    if (!body.certificate || !body.privateKey) {
      return { error: 'Certificat et clé privée requis (contenus des fichiers cert.pem et key.pem).' };
    }
    try {
      // Tolérant : reconstruit un PEM propre même si l'en-tête/pied manque ou
      // si des lignes parasites ("Bag Attributes"…) traînent.
      const cert = normalizePem(body.certificate, 'cert');
      const key = normalizePem(body.privateKey, 'key');
      const res = await this.telnyx.setupIosPush(cert, key);
      return { ok: true, id: res.id };
    } catch (e) {
      return { error: (e as Error).message };
    }
  }

  /** Accepte un JWT admin (Bearer) OU l'ancienne clé admin (repli). */
  private authorize(authorization?: string, key?: string) {
    if (authorization?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify<{ admin?: boolean }>(authorization.slice(7));
        if (payload?.admin) return;
      } catch {
        /* token invalide -> on tente la clé */
      }
    }
    if (key && key === config.adminKey) return;
    throw new UnauthorizedException('Accès admin refusé');
  }
}

/**
 * Reconstruit un bloc PEM propre à partir d'un collage approximatif :
 * - si un bloc -----BEGIN…END----- existe, on le garde tel quel ;
 * - sinon on enveloppe le base64 (en-tête déduit du type cert/clé).
 */
function normalizePem(raw: string, kind: 'cert' | 'key'): string {
  const text = (raw || '').trim();
  const block = text.match(/-----BEGIN [\s\S]*?-----END [^-]+-----/);
  if (block) return block[0].trim() + '\n';

  const b64 = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!b64) return text;
  const wrapped = (b64.match(/.{1,64}/g) || []).join('\n');

  let label = 'CERTIFICATE';
  if (kind === 'key') {
    // Clés RSA PKCS#1 (DER) commencent par MII…IBAAK ; PKCS#8 -> "PRIVATE KEY".
    label = /^MII[A-Za-z0-9+/]{0,6}IBAAK/.test(b64) ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  }
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
}
