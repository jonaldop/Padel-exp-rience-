import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';

/**
 * Stockage de données simple, persistant sur fichier JSON.
 *
 * Pourquoi ce choix au MVP : zéro dépendance externe, tourne partout (pas de
 * Postgres ni de moteur à télécharger), idéal pour démarrer et pour une beta de
 * quelques clients. Les méthodes sont volontairement orientées "métier".
 *
 * ➜ POUR LA PROD / LE SCALE : migrer vers PostgreSQL. Le schéma cible est déjà
 *   décrit dans apps/api/prisma/schema.prisma et docs/04-modele-donnees.md.
 *   Il suffira de réimplémenter ces mêmes méthodes avec Prisma.
 */

export interface Account {
  id: string;
  companyName: string;
  siret?: string;
  address?: string;
  country: string;
  plan: string;
  status: string;
  createdAt: string;
  /** Fin de la période d'essai (ISO). null/absent + statut trial = essai ILLIMITÉ. */
  trialEndsAt?: string | null;
  /** Remise permanente sur la formule, en % (0-100). */
  discountPct?: number;
  /** Abonnement Stripe (prélèvement automatique mensuel). */
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}

/** Facture mensuelle d'abonnement (générée automatiquement, hors période d'essai). */
export interface Invoice {
  id: string;
  accountId: string;
  number: string; // ex. JOE-2026-07-0001
  period: string; // mois facturé, YYYY-MM
  planKey: string;
  planName: string;
  baseAmount: number; // prix formule (TTC)
  discountPct: number;
  /** Dépassement de minutes facturé (celui du MOIS PRÉCÉDENT, clos). */
  overageMinutes?: number;
  overageAmount?: number;
  overagePeriod?: string; // YYYY-MM du dépassement
  total: number; // TTC après remise (+ dépassement éventuel)
  status: 'due' | 'paid' | 'void';
  createdAt: string;
}
export interface User {
  id: string;
  accountId: string;
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phonePerso?: string;
  role: string;
  createdAt: string;
}
export interface PhoneSettings {
  phoneNumberId: string;
  timezone: string;
  weeklySchedule: string;
  holidays: string;
  greetingOpen?: string;
  greetingClosed?: string;
  greetingVoice: string;
  ringTimeoutS: number;
  forwardToMobile: boolean;
  forwardNumber?: string;
  voicemailEnabled: boolean;
  recordingEnabled: boolean;
  aiEnabled: boolean;
  ringInApp?: boolean;
  /** Secrétaire CONVERSATIONNEL (questions/réponses IA). true par défaut. */
  aiConversational?: boolean;
}
export interface PhoneNumber {
  id: string;
  accountId: string;
  e164: string;
  type: string;
  provider: string;
  providerNumberId?: string | null;
  origin: string;
  status: string;
  createdAt: string;
}
export interface Call {
  id: string;
  accountId: string;
  phoneNumberId?: string | null;
  direction: string;
  fromE164: string;
  toE164: string;
  status: string;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationS?: number | null;
  recordingUrl?: string | null;
  costAmount?: number | null;
  providerCallId?: string | null;
}
export interface Voicemail {
  id: string;
  callId: string;
  audioUrl?: string | null;
  /** Id d'enregistrement Telnyx : permet de générer un lien FRAIS à l'écoute
   *  (les liens S3 fournis au webhook expirent en 10 minutes). */
  providerRecordingId?: string | null;
  durationS?: number | null;
  transcriptionText?: string | null;
  transcriptionStatus: string;
  // Secrétariat IA : qualification du message (docs/08 AI-1)
  aiCategory?: string | null; // devis | urgence | rdv | rappel | autre
  aiUrgency?: string | null; // haute | normale
  aiSummary?: string | null; // résumé en 1 phrase pour l'artisan
  isRead: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  accountId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: string;
}

export interface Device {
  id: string;
  accountId: string;
  userId: string;
  token: string; // Expo push token
  platform: string;
  createdAt: string;
}

/** Note interne (visible uniquement dans le back-office admin). */
export interface AdminNote {
  id: string;
  accountId: string;
  text: string;
  createdAt: string;
}

export interface Message {
  id: string;
  accountId: string;
  phoneNumberId?: string | null;
  direction: 'inbound' | 'outbound';
  fromE164: string;
  toE164: string;
  body: string;
  status: string; // queued | sent | delivered | received | failed
  providerMessageId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Plan {
  key: string;
  name: string;
  monthlyPrice: number;
  includedMinutes: number;
  features: string[];
  active: boolean;
}

interface Data {
  accounts: Account[];
  users: User[];
  phoneNumbers: PhoneNumber[];
  settings: PhoneSettings[];
  calls: Call[];
  voicemails: Voicemail[];
  clients: Client[];
  resets: { token: string; userId: string; expiresAt: number }[];
  plans: Plan[];
  messages: Message[];
  devices: Device[];
  adminNotes: AdminNote[];
  invoices: Invoice[];
  /** Réglages plateforme posés depuis le back-office (ex. clé Stripe). */
  appSettings: Record<string, string>;
}

const DEFAULT_PLANS: Plan[] = [
  { key: 'essentiel', name: 'Essentiel', monthlyPrice: 14.99, includedMinutes: 500, features: ['1 numéro pro', 'Appels & messagerie', 'Répondeur, horaires & transcription'], active: true },
  { key: 'pro', name: 'Pro', monthlyPrice: 29, includedMinutes: 1500, features: ['Tout Essentiel', 'Secrétariat IA (résumés, urgences)', 'Renvoi avancé'], active: true },
  { key: 'business', name: 'Business', monthlyPrice: 49, includedMinutes: 999999, features: ['Tout Pro', 'Appels illimités en France', 'Multi-utilisateurs'], active: true },
];

const DEFAULT_SCHEDULE = JSON.stringify({
  mon: ['09:00-12:00', '14:00-18:00'],
  tue: ['09:00-12:00', '14:00-18:00'],
  wed: ['09:00-12:00', '14:00-18:00'],
  thu: ['09:00-12:00', '14:00-18:00'],
  fri: ['09:00-12:00', '14:00-18:00'],
  sat: [],
  sun: [],
});

@Injectable()
export class DbService implements OnModuleInit {
  private data: Data = {
    accounts: [],
    users: [],
    phoneNumbers: [],
    settings: [],
    calls: [],
    voicemails: [],
    clients: [],
    resets: [],
    plans: [],
    messages: [],
    devices: [],
    adminNotes: [],
    invoices: [],
    appSettings: {},
  };
  private readonly file = process.env.DB_FILE || path.resolve(process.cwd(), 'data.json');

  onModuleInit() {
    this.load();
    // Amorce les formules par défaut au premier démarrage.
    if (!this.data.plans || this.data.plans.length === 0) {
      this.data.plans = DEFAULT_PLANS.map((p) => ({ ...p }));
    } else {
      // Migration 2026-07 : minutes boostées (500/1500/illimité) — uniquement si
      // le plan a encore ses anciennes valeurs d'origine (on ne touche pas aux
      // formules personnalisées dans l'admin).
      const bump: Record<string, { from: number; to: number; features: string[] }> = {
        essentiel: { from: 200, to: 500, features: ['1 numéro pro', 'Appels & messagerie', 'Répondeur, horaires & transcription'] },
        pro: { from: 600, to: 1500, features: ['Tout Essentiel', 'Secrétariat IA (résumés, urgences)', 'Renvoi avancé'] },
        business: { from: 1500, to: 999999, features: ['Tout Pro', 'Appels illimités en France', 'Multi-utilisateurs'] },
      };
      let migrated = false;
      for (const plan of this.data.plans) {
        const b = bump[plan.key];
        if (b && plan.includedMinutes === b.from) {
          plan.includedMinutes = b.to;
          plan.features = b.features;
          migrated = true;
        }
      }
      if (migrated) this.save();
    }
    this.save();
  }

  private load() {
    try {
      if (fs.existsSync(this.file)) {
        this.data = { ...this.data, ...JSON.parse(fs.readFileSync(this.file, 'utf8')) };
      }
    } catch {
      /* fichier corrompu -> on repart vide */
    }
  }

  private save() {
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  private now() {
    return new Date().toISOString();
  }

  // ── Comptes & utilisateurs ─────────────────────────────────────────────────

  createAccountWithOwner(input: {
    companyName: string;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    plan?: string;
    status?: string;
    trialEndsAt?: string | null;
  }): { account: Account; user: User } {
    const account: Account = {
      id: randomUUID(),
      companyName: input.companyName,
      country: 'FR',
      plan: input.plan || 'starter',
      status: input.status || 'trial',
      trialEndsAt: input.trialEndsAt ?? null,
      discountPct: 0,
      createdAt: this.now(),
    };
    const user: User = {
      id: randomUUID(),
      accountId: account.id,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'owner',
      createdAt: this.now(),
    };
    this.data.accounts.push(account);
    this.data.users.push(user);
    this.save();
    return { account, user };
  }

  findUserByEmail(email: string): (User & { account: Account }) | null {
    const user = this.data.users.find((u) => u.email === email.toLowerCase());
    if (!user) return null;
    const account = this.data.accounts.find((a) => a.id === user.accountId)!;
    return { ...user, account };
  }

  findUserById(id: string): (User & { account: Account }) | null {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    const account = this.data.accounts.find((a) => a.id === user.accountId)!;
    return { ...user, account };
  }

  /** Met à jour les infos perso de l'utilisateur (profil). */
  updateUserProfile(
    userId: string,
    patch: { firstName?: string; lastName?: string; phonePerso?: string },
  ): User | null {
    const u = this.data.users.find((x) => x.id === userId);
    if (!u) return null;
    for (const k of ['firstName', 'lastName', 'phonePerso'] as const) {
      if (patch[k] !== undefined) u[k] = patch[k];
    }
    this.save();
    return u;
  }

  /** Change la formule d'abonnement du compte. */
  updateAccountPlan(accountId: string, plan: string): Account | null {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    a.plan = plan;
    this.save();
    return a;
  }

  /** Change le statut d'un compte (active / trial / past_due / suspended / canceled). */
  updateAccountStatus(accountId: string, status: string): Account | null {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    a.status = status;
    this.save();
    return a;
  }

  // ── Essai, remise, facturation ─────────────────────────────────────────────

  /**
   * Définit la période d'essai d'un compte (et repasse le statut en 'trial').
   * trialEndsAt = null -> essai ILLIMITÉ.
   */
  setTrial(accountId: string, trialEndsAt: string | null): Account | null {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    a.trialEndsAt = trialEndsAt;
    a.status = 'trial';
    this.save();
    return a;
  }

  /** Remise permanente (%) appliquée à la formule d'un compte. */
  setDiscount(accountId: string, pct: number): Account | null {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    a.discountPct = Math.min(100, Math.max(0, Math.round(pct)));
    this.save();
    return a;
  }

  /** Infos d'essai calculées (jours restants, illimité, expiré). */
  trialInfo(a: Account) {
    const isTrial = a.status === 'trial';
    const unlimited = isTrial && !a.trialEndsAt;
    let daysLeft: number | null = null;
    let expired = false;
    if (isTrial && a.trialEndsAt) {
      const ms = new Date(a.trialEndsAt).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(ms / 86400000));
      expired = ms <= 0;
    }
    return { isTrial, unlimited, endsAt: a.trialEndsAt ?? null, daysLeft, expired };
  }

  /** Prix mensuel effectif (formule - remise). */
  effectivePrice(a: Account): number {
    const base = this.planPrice(a.plan);
    const pct = a.discountPct || 0;
    return Math.round(base * (1 - pct / 100) * 100) / 100;
  }

  /**
   * Génère (idempotent) les factures mensuelles manquantes d'un compte :
   * une facture par mois calendaire depuis la fin d'essai (ou la création si pas
   * d'essai daté), hors essai illimité/en cours, comptes résiliés et formules à 0 €.
   */
  ensureInvoices(accountId: string) {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return;
    // Abonnement Stripe actif : c'est Stripe qui rythme la facturation
    // (les factures payées arrivent via webhook), pas la génération interne.
    if (a.stripeSubscriptionId) return;
    const t = this.trialInfo(a);
    if (a.status === 'canceled') return;
    if (t.isTrial && (t.unlimited || !t.expired)) return; // essai en cours -> pas de facture

    const start = a.trialEndsAt ? new Date(a.trialEndsAt) : new Date(a.createdAt);
    const nowD = new Date();
    if (start > nowD) return;

    const plan = this.data.plans.find((p) => p.key === a.plan);
    const baseAmount = plan?.monthlyPrice ?? this.planPrice(a.plan);
    if (!baseAmount) return; // formule gratuite -> rien à facturer

    const existing = new Set(
      this.data.invoices.filter((i) => i.accountId === accountId).map((i) => i.period),
    );
    let changed = false;
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
    while (cur <= end) {
      const period = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      if (!existing.has(period)) {
        const pct = a.discountPct || 0;
        // Dépassement du MOIS PRÉCÉDENT (clos, donc définitif) : facturé au réel
        // sur la facture du mois courant — sauf formules illimitées.
        const prev = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
        const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
        const included = plan?.includedMinutes ?? 0;
        const unlimited = included >= 99999;
        const overMin = !unlimited && included > 0 && prev >= start
          ? Math.max(0, this.minutesForMonth(accountId, prevPeriod) - included)
          : 0;
        const overAmt = Math.round(overMin * config.overageRatePerMinute * 100) / 100;
        const total = Math.round((baseAmount * (1 - pct / 100) + overAmt) * 100) / 100;
        const seq = this.data.invoices.length + 1;
        this.data.invoices.push({
          id: randomUUID(),
          accountId,
          number: `JOE-${period}-${String(seq).padStart(4, '0')}`,
          period,
          planKey: a.plan,
          planName: plan?.name || a.plan,
          baseAmount,
          discountPct: pct,
          overageMinutes: overMin || undefined,
          overageAmount: overAmt || undefined,
          overagePeriod: overMin ? prevPeriod : undefined,
          total,
          status: 'due',
          createdAt: this.now(),
        });
        changed = true;
      }
      cur.setMonth(cur.getMonth() + 1);
    }
    if (changed) this.save();
  }

  /** Factures d'un compte (génère les manquantes), plus récentes d'abord. */
  listInvoices(accountId: string): Invoice[] {
    this.ensureInvoices(accountId);
    return this.data.invoices
      .filter((i) => i.accountId === accountId)
      .sort((a, b) => b.period.localeCompare(a.period));
  }

  /** Change le statut d'une facture (paid / due / void). */
  setInvoiceStatus(id: string, status: 'due' | 'paid' | 'void'): Invoice | null {
    const i = this.data.invoices.find((x) => x.id === id);
    if (!i) return null;
    i.status = status;
    this.save();
    return i;
  }

  /** Lie un compte à son abonnement Stripe (prélèvement auto). */
  setAccountStripe(accountId: string, customerId: string | null, subscriptionId: string | null): Account | null {
    const a = this.data.accounts.find((x) => x.id === accountId);
    if (!a) return null;
    a.stripeCustomerId = customerId;
    a.stripeSubscriptionId = subscriptionId;
    this.save();
    return a;
  }

  findAccountBySubscription(subscriptionId: string): Account | null {
    return this.data.accounts.find((a) => a.stripeSubscriptionId === subscriptionId) || null;
  }

  findAccountById(accountId: string): Account | null {
    return this.data.accounts.find((a) => a.id === accountId) || null;
  }

  /**
   * Enregistre une facture PAYÉE issue d'un prélèvement Stripe (abonnement).
   * Idempotent par période : si la facture du mois existe, elle passe payée.
   */
  recordPaidInvoice(accountId: string, period: string, amount: number): Invoice {
    const existing = this.data.invoices.find((i) => i.accountId === accountId && i.period === period);
    if (existing) {
      existing.status = 'paid';
      existing.total = amount;
      this.save();
      return existing;
    }
    const a = this.data.accounts.find((x) => x.id === accountId);
    const plan = this.data.plans.find((p) => p.key === a?.plan);
    const seq = this.data.invoices.length + 1;
    const inv: Invoice = {
      id: randomUUID(),
      accountId,
      number: `JOE-${period}-${String(seq).padStart(4, '0')}`,
      period,
      planKey: a?.plan || '',
      planName: plan?.name || a?.plan || '',
      baseAmount: plan?.monthlyPrice ?? amount,
      discountPct: a?.discountPct || 0,
      total: amount,
      status: 'paid',
      createdAt: this.now(),
    };
    this.data.invoices.push(inv);
    this.save();
    return inv;
  }

  // ── Notes internes (back-office admin) ─────────────────────────────────────

  listAdminNotes(accountId: string): AdminNote[] {
    return (this.data.adminNotes || [])
      .filter((n) => n.accountId === accountId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  addAdminNote(accountId: string, text: string): AdminNote {
    const note: AdminNote = { id: randomUUID(), accountId, text, createdAt: this.now() };
    if (!this.data.adminNotes) this.data.adminNotes = [];
    this.data.adminNotes.push(note);
    this.save();
    return note;
  }

  deleteAdminNote(id: string): boolean {
    const before = (this.data.adminNotes || []).length;
    this.data.adminNotes = (this.data.adminNotes || []).filter((n) => n.id !== id);
    const changed = this.data.adminNotes.length !== before;
    if (changed) this.save();
    return changed;
  }

  // ── Numéros & réglages ─────────────────────────────────────────────────────

  countByE164(accountId: string, e164: string): number {
    return this.data.phoneNumbers.filter((n) => n.accountId === accountId && n.e164 === e164).length;
  }

  /** True si ce numéro est déjà rattaché à un AUTRE compte (sécurité multi-tenant). */
  e164OwnedByOtherAccount(accountId: string, e164: string): boolean {
    return this.data.phoneNumbers.some((n) => n.e164 === e164 && n.accountId !== accountId);
  }

  createPhoneNumber(input: {
    accountId: string;
    e164: string;
    type?: string;
    providerNumberId?: string | null;
    origin?: string;
    status?: string;
    greetingClosed?: string;
  }): PhoneNumber & { settings: PhoneSettings } {
    // Anti-doublon : si ce numéro existe déjà pour ce compte, on le renvoie tel quel.
    const existing = this.data.phoneNumbers.find(
      (n) => n.accountId === input.accountId && n.e164 === input.e164,
    );
    if (existing) {
      return { ...existing, settings: this.settingsOf(existing.id) };
    }
    const num: PhoneNumber = {
      id: randomUUID(),
      accountId: input.accountId,
      e164: input.e164,
      type: input.type || 'geographic',
      provider: 'telnyx',
      providerNumberId: input.providerNumberId ?? null,
      origin: input.origin || 'new',
      status: input.status || 'active',
      createdAt: this.now(),
    };
    const settings: PhoneSettings = {
      phoneNumberId: num.id,
      timezone: 'Europe/Paris',
      weeklySchedule: DEFAULT_SCHEDULE,
      holidays: '[]',
      greetingClosed:
        input.greetingClosed ||
        'Bonjour, nos bureaux sont fermés. Laissez un message après le bip.',
      greetingVoice: 'Polly.Lea-Neural',
      ringTimeoutS: 20,
      forwardToMobile: false,
      voicemailEnabled: true,
      recordingEnabled: false,
      aiEnabled: false,
      ringInApp: false,
    };
    this.data.phoneNumbers.push(num);
    this.data.settings.push(settings);
    this.save();
    return { ...num, settings };
  }

  listPhoneNumbers(accountId: string) {
    return this.data.phoneNumbers
      .filter((n) => n.accountId === accountId)
      .map((n) => ({ ...n, settings: this.settingsOf(n.id) }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findPhoneNumber(accountId: string, id: string) {
    const n = this.data.phoneNumbers.find((x) => x.id === id && x.accountId === accountId);
    return n ? { ...n, settings: this.settingsOf(n.id) } : null;
  }

  findFirstPhoneNumber(accountId: string) {
    const n = this.data.phoneNumbers.find((x) => x.accountId === accountId);
    return n ? { ...n, settings: this.settingsOf(n.id) } : null;
  }

  findPhoneNumberByE164(e164: string) {
    // En cas de doublons, prend le plus récemment configuré (aligné sur l'UI).
    const n = this.data.phoneNumbers
      .filter((x) => x.e164 === e164)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (!n) return null;
    const account = this.data.accounts.find((a) => a.id === n.accountId)!;
    return { ...n, settings: this.settingsOf(n.id), account };
  }

  private settingsOf(phoneNumberId: string) {
    return this.data.settings.find((s) => s.phoneNumberId === phoneNumberId)!;
  }

  updateSettings(phoneNumberId: string, patch: Partial<PhoneSettings>) {
    const s = this.settingsOf(phoneNumberId);
    if (!s) return null;
    Object.assign(s, patch);
    this.save();
    return s;
  }

  // ── Appels & messagerie ────────────────────────────────────────────────────

  createCall(input: Omit<Call, 'id' | 'startedAt'> & { startedAt?: string }): Call {
    const call: Call = {
      id: randomUUID(),
      startedAt: input.startedAt || this.now(),
      ...input,
    } as Call;
    this.data.calls.push(call);
    this.save();
    return call;
  }

  listCalls(accountId: string) {
    return this.data.calls
      .filter((c) => c.accountId === accountId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, 200)
      .map((c) => ({ ...c, voicemail: this.data.voicemails.find((v) => v.callId === c.id) || null }));
  }

  /**
   * Jambe A d'un transfert vers l'app : dernier appel ENTRANT encore en
   * 'ringing-app' pour cet appelant (< 5 min). Sert au repli répondeur quand
   * l'app ne décroche pas (la jambe SIP meurt en 487/timeout).
   */
  findRingingAppCall(fromE164: string) {
    const cutoff = Date.now() - 5 * 60_000;
    return (
      [...this.data.calls]
        .reverse()
        .find(
          (c) =>
            c.direction === 'inbound' &&
            c.status === 'ringing-app' &&
            c.fromE164 === fromE164 &&
            new Date(c.startedAt).getTime() > cutoff,
        ) || null
    );
  }

  findCallById(id: string) {
    return this.data.calls.find((c) => c.id === id) || null;
  }

  findCallByProviderId(providerCallId: string) {
    const c = this.data.calls.find((x) => x.providerCallId === providerCallId);
    if (!c) return null;
    const phoneNumber = c.phoneNumberId
      ? { ...this.data.phoneNumbers.find((n) => n.id === c.phoneNumberId)!, settings: this.settingsOf(c.phoneNumberId) }
      : null;
    return { ...c, phoneNumber };
  }

  updateCall(id: string, patch: Partial<Call>) {
    const c = this.data.calls.find((x) => x.id === id);
    if (!c) return null;
    Object.assign(c, patch);
    this.save();
    return c;
  }

  createVoicemail(input: { callId: string; audioUrl?: string | null; recordingId?: string | null }) {
    const vm: Voicemail = {
      id: randomUUID(),
      callId: input.callId,
      audioUrl: input.audioUrl ?? null,
      providerRecordingId: input.recordingId ?? null,
      transcriptionStatus: 'pending',
      isRead: false,
      createdAt: this.now(),
    };
    this.data.voicemails.push(vm);
    this.save();
    return vm;
  }

  updateVoicemail(id: string, patch: Partial<Voicemail>) {
    const vm = this.data.voicemails.find((v) => v.id === id);
    if (!vm) return null;
    Object.assign(vm, patch);
    this.save();
    return vm;
  }

  /** Marque tous les vocaux du compte comme lus (badge cloche). */
  markVoicemailsRead(accountId: string): number {
    const callIds = new Set(this.data.calls.filter((c) => c.accountId === accountId).map((c) => c.id));
    let n = 0;
    for (const v of this.data.voicemails) {
      if (callIds.has(v.callId) && !v.isRead) { v.isRead = true; n++; }
    }
    if (n) this.save();
    return n;
  }

  deleteVoicemail(id: string): boolean {
    const before = this.data.voicemails.length;
    this.data.voicemails = this.data.voicemails.filter((v) => v.id !== id);
    if (this.data.voicemails.length === before) return false;
    this.save();
    return true;
  }

  findVoicemailById(id: string) {
    return this.data.voicemails.find((v) => v.id === id) || null;
  }

  findVoicemailByCallId(callId: string) {
    return this.data.voicemails.find((v) => v.callId === callId) || null;
  }

  listVoicemails(accountId: string) {
    const callIds = new Set(this.data.calls.filter((c) => c.accountId === accountId).map((c) => c.id));
    return this.data.voicemails
      .filter((v) => callIds.has(v.callId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => ({ ...v, call: this.data.calls.find((c) => c.id === v.callId) }));
  }

  // ── SMS ────────────────────────────────────────────────────────────────────

  createMessage(input: Omit<Message, 'id' | 'createdAt' | 'isRead'> & { isRead?: boolean; createdAt?: string }): Message {
    const msg: Message = {
      id: randomUUID(),
      isRead: input.isRead ?? false,
      createdAt: input.createdAt || this.now(),
      ...input,
    } as Message;
    this.data.messages.push(msg);
    this.save();
    return msg;
  }

  updateMessageStatus(providerMessageId: string, status: string) {
    const m = this.data.messages.find((x) => x.providerMessageId === providerMessageId);
    if (m) { m.status = status; this.save(); }
    return m || null;
  }

  updateMessage(id: string, patch: Partial<Message>) {
    const m = this.data.messages.find((x) => x.id === id);
    if (m) { Object.assign(m, patch); this.save(); }
    return m || null;
  }

  /** Le "correspondant" d'un message (le numéro externe, pas notre numéro pro). */
  private peerOf(m: Message): string {
    return m.direction === 'inbound' ? m.fromE164 : m.toE164;
  }

  /** Liste des conversations (dernier message + non-lus) pour un compte. */
  listThreads(accountId: string) {
    const mine = this.data.messages.filter((m) => m.accountId === accountId);
    const byPeer = new Map<string, Message[]>();
    for (const m of mine) {
      const p = this.peerOf(m);
      (byPeer.get(p) || byPeer.set(p, []).get(p)!).push(m);
    }
    return [...byPeer.entries()]
      .map(([peer, msgs]) => {
        const sorted = msgs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const last = sorted[0];
        const unread = msgs.filter((m) => m.direction === 'inbound' && !m.isRead).length;
        return {
          peer,
          last: { body: last.body, direction: last.direction, createdAt: last.createdAt, status: last.status },
          unread,
          updatedAt: last.createdAt,
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Messages d'une conversation (ordre chronologique). */
  listThread(accountId: string, peer: string) {
    const k = (n: string) => (n || '').replace(/\D/g, '').slice(-9);
    const kp = k(peer);
    return this.data.messages
      .filter((m) => m.accountId === accountId && (k(this.peerOf(m)) === kp))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  markThreadRead(accountId: string, peer: string) {
    const k = (n: string) => (n || '').replace(/\D/g, '').slice(-9);
    const kp = k(peer);
    let n = 0;
    for (const m of this.data.messages) {
      if (m.accountId === accountId && m.direction === 'inbound' && !m.isRead && k(m.fromE164) === kp) {
        m.isRead = true; n++;
      }
    }
    if (n) this.save();
    return n;
  }

  /** Nombre total de SMS entrants non lus (pour le badge). */
  unreadMessages(accountId: string) {
    return this.data.messages.filter((m) => m.accountId === accountId && m.direction === 'inbound' && !m.isRead).length;
  }

  // ── Devices (notifications push) ───────────────────────────────────────────

  /** Enregistre/rafraîchit le token push d'un appareil (dédoublonné par token). */
  registerDevice(accountId: string, userId: string, token: string, platform: string) {
    if (!token) return null;
    let d = this.data.devices.find((x) => x.token === token);
    if (d) {
      d.accountId = accountId; d.userId = userId; d.platform = platform;
    } else {
      d = { id: randomUUID(), accountId, userId, token, platform, createdAt: this.now() };
      this.data.devices.push(d);
    }
    this.save();
    return d;
  }

  /** Tokens push de tous les appareils d'un compte. */
  devicesForAccount(accountId: string): string[] {
    return this.data.devices.filter((d) => d.accountId === accountId).map((d) => d.token);
  }

  // ── Clients (carnet de contacts) ───────────────────────────────────────────

  createClient(input: { accountId: string; name: string; phone: string; email?: string; notes?: string }): Client {
    const c: Client = {
      id: randomUUID(),
      accountId: input.accountId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
      createdAt: this.now(),
    };
    this.data.clients.push(c);
    this.save();
    return c;
  }

  createManyClients(accountId: string, items: { name: string; phone: string }[]): number {
    let n = 0;
    for (const it of items) {
      if (!it.phone) continue;
      // évite les doublons par numéro
      if (this.data.clients.some((c) => c.accountId === accountId && c.phone === it.phone)) continue;
      this.data.clients.push({
        id: randomUUID(),
        accountId,
        name: it.name || it.phone,
        phone: it.phone,
        createdAt: this.now(),
      });
      n++;
    }
    if (n) this.save();
    return n;
  }

  listClients(accountId: string, search?: string): Client[] {
    let list = this.data.clients.filter((c) => c.accountId === accountId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  updateClient(accountId: string, id: string, patch: Partial<Client>): Client | null {
    const c = this.data.clients.find((x) => x.id === id && x.accountId === accountId);
    if (!c) return null;
    for (const k of ['name', 'phone', 'email', 'notes'] as const) {
      if (patch[k] !== undefined) (c as any)[k] = patch[k];
    }
    this.save();
    return c;
  }

  deleteClient(accountId: string, id: string): boolean {
    const before = this.data.clients.length;
    this.data.clients = this.data.clients.filter((c) => !(c.id === id && c.accountId === accountId));
    const removed = this.data.clients.length < before;
    if (removed) this.save();
    return removed;
  }

  // ── Réinitialisation de mot de passe ───────────────────────────────────────

  createPasswordReset(userId: string): string {
    const token = randomUUID() + randomUUID().replace(/-/g, '');
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 min
    this.data.resets = this.data.resets.filter((r) => r.userId !== userId); // 1 actif/user
    this.data.resets.push({ token, userId, expiresAt });
    this.save();
    return token;
  }

  consumePasswordReset(token: string): string | null {
    const r = this.data.resets.find((x) => x.token === token);
    if (!r || r.expiresAt < Date.now()) return null;
    this.data.resets = this.data.resets.filter((x) => x.token !== token);
    this.save();
    return r.userId;
  }

  setUserPassword(userId: string, passwordHash: string): boolean {
    const u = this.data.users.find((x) => x.id === userId);
    if (!u) return false;
    u.passwordHash = passwordHash;
    this.save();
    return true;
  }

  // ── Formules (plans) ───────────────────────────────────────────────────────

  listPlans(): Plan[] {
    return [...this.data.plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  }

  /** Crée ou met à jour une formule (par clé). */
  upsertPlan(input: Partial<Plan> & { key: string }): Plan {
    let p = this.data.plans.find((x) => x.key === input.key);
    if (!p) {
      p = {
        key: input.key,
        name: input.name || input.key,
        monthlyPrice: input.monthlyPrice ?? 0,
        includedMinutes: input.includedMinutes ?? 0,
        features: input.features ?? [],
        active: input.active ?? true,
      };
      this.data.plans.push(p);
    } else {
      if (input.name !== undefined) p.name = input.name;
      if (input.monthlyPrice !== undefined) p.monthlyPrice = input.monthlyPrice;
      if (input.includedMinutes !== undefined) p.includedMinutes = input.includedMinutes;
      if (input.features !== undefined) p.features = input.features;
      if (input.active !== undefined) p.active = input.active;
    }
    this.save();
    return p;
  }

  deletePlan(key: string): boolean {
    const before = this.data.plans.length;
    this.data.plans = this.data.plans.filter((p) => p.key !== key);
    const removed = this.data.plans.length < before;
    if (removed) this.save();
    return removed;
  }

  private planPrice(key: string): number {
    return this.data.plans.find((p) => p.key === key)?.monthlyPrice ?? 0;
  }

  /** Libellé "à jour" du paiement selon le statut d'abonnement. */
  private billingLabel(status: string): { aJour: boolean; libelle: string } {
    switch (status) {
      case 'active':
        return { aJour: true, libelle: 'Abonnement actif (à jour)' };
      case 'trial':
        return { aJour: true, libelle: 'Période d’essai' };
      case 'past_due':
        return { aJour: false, libelle: 'Paiement en retard' };
      case 'suspended':
        return { aJour: false, libelle: 'Suspendu' };
      case 'canceled':
        return { aJour: false, libelle: 'Résilié' };
      default:
        return { aJour: false, libelle: status || 'inconnu' };
    }
  }

  /** Back-office admin : tous les comptes avec un résumé détaillé + coûts. */
  adminListAccounts(costPerMinute = 0.02) {
    return this.data.accounts
      .map((a) => {
        const users = this.data.users.filter((u) => u.accountId === a.id);
        const numbers = this.data.phoneNumbers.filter((n) => n.accountId === a.id);
        const calls = this.data.calls.filter((c) => c.accountId === a.id);
        const clients = this.data.clients.filter((c) => c.accountId === a.id);
        const billing = this.billingLabel(a.status);
        const lastCall = calls
          .map((c) => c.startedAt)
          .sort((x, y) => (y || '').localeCompare(x || ''))[0];

        const totalSeconds = calls.reduce((s, c) => s + (c.durationS || 0), 0);
        const minutes = Math.round(totalSeconds / 60);
        const prixMensuel = this.planPrice(a.plan);
        // Coût réel si Telnyx l'a renseigné, sinon estimation par minute.
        const realCost = calls.reduce((s, c) => s + (c.costAmount || 0), 0);
        const coutEstime = realCost > 0 ? realCost : minutes * costPerMinute;
        const marge = prixMensuel - coutEstime;

        return {
          id: a.id,
          entreprise: a.companyName,
          siret: a.siret || null,
          plan: a.plan,
          prixMensuel,
          remisePct: a.discountPct || 0,
          prixEffectif: this.effectivePrice(a),
          essai: this.trialInfo(a),
          abonnementAuto: Boolean(a.stripeSubscriptionId),
          statut: a.status,
          paiementAJour: billing.aJour,
          paiementLibelle: billing.libelle,
          créé: a.createdAt,
          utilisateurs: users.map((u) => ({
            email: u.email,
            nom: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
            telPerso: u.phonePerso || null,
            role: u.role,
          })),
          emails: users.map((u) => u.email),
          numeros: numbers.map((n) => ({ e164: n.e164, type: n.type, statut: n.status })),
          nbAppels: calls.length,
          dernierAppel: lastCall || null,
          minutes,
          coutEstime: Math.round(coutEstime * 100) / 100,
          marge: Math.round(marge * 100) / 100,
          nbClients: clients.length,
          clients: clients.slice(0, 50).map((c) => ({ nom: c.name, tel: c.phone, email: c.email || null })),
        };
      })
      .sort((x, y) => (y.créé || '').localeCompare(x.créé || ''));
  }

  /** Synthèse globale pour le tableau de bord admin. */
  adminSummary(costPerMinute = 0.02) {
    const accounts = this.adminListAccounts(costPerMinute);
    const actifs = accounts.filter((a) => a.statut === 'active' || a.statut === 'trial');
    const mrr = accounts.reduce((s, a) => s + (a.prixMensuel || 0), 0);
    const coutTotal = accounts.reduce((s, a) => s + (a.coutEstime || 0), 0);
    const minutesTotal = accounts.reduce((s, a) => s + (a.minutes || 0), 0);
    return {
      nbComptes: accounts.length,
      nbActifs: actifs.length,
      mrr: Math.round(mrr * 100) / 100,
      coutTotal: Math.round(coutTotal * 100) / 100,
      margeTotale: Math.round((mrr - coutTotal) * 100) / 100,
      minutesTotal,
      nbAppels: this.data.calls.length,
      nbNumeros: this.data.phoneNumbers.length,
    };
  }

  /**
   * Espace client : forfait courant + consommation (mois en cours + historique
   * mensuel). Sert à l'écran "Mon forfait" de l'app.
   */
  /** Minutes consommées par un compte sur un mois donné (YYYY-MM). */
  minutesForMonth(accountId: string, period: string): number {
    const seconds = this.data.calls
      .filter((c) => c.accountId === accountId && (c.startedAt || '').slice(0, 7) === period)
      .reduce((s, c) => s + (c.durationS || 0), 0);
    return Math.round(seconds / 60);
  }

  /**
   * PARE-FEU USAGE (anti-fraude / anti-abus) : état des appels SORTANTS.
   * - ok       : dans le forfait
   * - overage  : au-delà des minutes incluses (autorisé, facturé au réel)
   * - blocked  : plafond dur atteint -> appels sortants coupés
   * Plafond dur : 2x les minutes incluses (mini +300), fair-use 4000 min
   * pour les formules illimitées.
   */
  usageGuard(accountId: string): {
    state: 'ok' | 'overage' | 'blocked';
    usedMinutes: number;
    includedMinutes: number;
    capMinutes: number;
  } {
    const a = this.data.accounts.find((x) => x.id === accountId);
    const plan = this.data.plans.find((p) => p.key === a?.plan) || null;
    const included = plan?.includedMinutes ?? 0;
    const unlimited = included >= 99999;
    const period = this.now().slice(0, 7);
    const used = this.minutesForMonth(accountId, period);
    const cap = unlimited ? 4000 : included > 0 ? Math.max(included * 2, included + 300) : 500;
    const state = used >= cap ? 'blocked' : !unlimited && included > 0 && used > included ? 'overage' : 'ok';
    return { state, usedMinutes: used, includedMinutes: included, capMinutes: cap };
  }

  /** Comptes à surveiller (>80 % du plafond dur ou bloqués) pour l'admin. */
  adminUsageAlerts() {
    const alerts: any[] = [];
    for (const a of this.data.accounts) {
      if (a.status === 'canceled' || a.status === 'suspended') continue;
      const g = this.usageGuard(a.id);
      if (g.usedMinutes >= g.capMinutes * 0.8) {
        const owner = this.data.users.find((u) => u.accountId === a.id && u.role === 'owner');
        alerts.push({
          accountId: a.id,
          companyName: a.companyName,
          email: owner?.email || '',
          plan: a.plan,
          ...g,
          blocked: g.state === 'blocked',
        });
      }
    }
    return alerts.sort((x, y) => y.usedMinutes - x.usedMinutes);
  }

  accountUsage(accountId: string, costPerMinute = 0.02) {
    const account = this.data.accounts.find((a) => a.id === accountId);
    const calls = this.data.calls.filter((c) => c.accountId === accountId);
    const planKey = account?.plan || 'starter';
    const plan = this.data.plans.find((p) => p.key === planKey) || null;
    const includedMinutes = plan?.includedMinutes ?? 0;
    const monthlyPrice = plan?.monthlyPrice ?? this.planPrice(planKey);

    const monthKey = (iso: string) => (iso || '').slice(0, 7); // YYYY-MM
    const nowMonth = monthKey(this.now());

    // Agrégat par mois (12 derniers mois), tri décroissant.
    const byMonth = new Map<string, { minutes: number; seconds: number; calls: number; inbound: number; outbound: number }>();
    for (const c of calls) {
      const m = monthKey(c.startedAt);
      if (!m) continue;
      const e = byMonth.get(m) || { minutes: 0, seconds: 0, calls: 0, inbound: 0, outbound: 0 };
      e.seconds += c.durationS || 0;
      e.calls += 1;
      if (c.direction === 'inbound') e.inbound += 1; else e.outbound += 1;
      byMonth.set(m, e);
    }
    const history = [...byMonth.entries()]
      .map(([month, e]) => ({
        month,
        minutes: Math.round(e.seconds / 60),
        calls: e.calls,
        inbound: e.inbound,
        outbound: e.outbound,
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);

    const cur = byMonth.get(nowMonth) || { seconds: 0, calls: 0, inbound: 0, outbound: 0, minutes: 0 } as any;
    const minutesThisMonth = Math.round((cur.seconds || 0) / 60);
    const remaining = includedMinutes ? Math.max(0, includedMinutes - minutesThisMonth) : 0;
    const overMinutes = includedMinutes ? Math.max(0, minutesThisMonth - includedMinutes) : minutesThisMonth;
    const percentUsed = includedMinutes ? Math.min(100, Math.round((minutesThisMonth / includedMinutes) * 100)) : 0;

    const totalSeconds = calls.reduce((s, c) => s + (c.durationS || 0), 0);

    return {
      plan: plan
        ? { key: plan.key, name: plan.name, monthlyPrice: plan.monthlyPrice, includedMinutes: plan.includedMinutes, features: plan.features }
        : { key: planKey, name: planKey, monthlyPrice, includedMinutes: 0, features: [] },
      billing: this.billingLabel(account?.status || 'trial'),
      status: account?.status || 'trial',
      trial: account ? this.trialInfo(account) : null,
      autoBilling: Boolean(account?.stripeSubscriptionId),
      discountPct: account?.discountPct || 0,
      effectiveMonthlyPrice: account ? this.effectivePrice(account) : monthlyPrice,
      thisMonth: {
        month: nowMonth,
        minutes: minutesThisMonth,
        calls: cur.calls || 0,
        inbound: cur.inbound || 0,
        outbound: cur.outbound || 0,
        includedMinutes,
        remainingMinutes: remaining,
        overMinutes,
        percentUsed,
        extraCost: Math.round(overMinutes * costPerMinute * 100) / 100,
      },
      totals: {
        minutes: Math.round(totalSeconds / 60),
        calls: calls.length,
      },
      history,
    };
  }

  // ── Diagnostic appels entrants (en mémoire, non persisté) ──────────────────
  private debugInbound: any[] = [];

  logInbound(entry: any) {
    this.debugInbound.unshift({ at: this.now(), ...entry });
    if (this.debugInbound.length > 40) this.debugInbound.length = 40;
  }
  getInboundLog() {
    return this.debugInbound;
  }

  // ── Réglages plateforme (back-office) ──────────────────────────────────────

  getSetting(key: string): string {
    return (this.data.appSettings || {})[key] || '';
  }

  setSetting(key: string, value: string) {
    if (!this.data.appSettings) this.data.appSettings = {};
    if (value) this.data.appSettings[key] = value;
    else delete this.data.appSettings[key];
    this.save();
  }

  // util pour le seed
  hasUser(email: string) {
    return this.data.users.some((u) => u.email === email.toLowerCase());
  }
}
