import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
  durationS?: number | null;
  transcriptionText?: string | null;
  transcriptionStatus: string;
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

interface Data {
  accounts: Account[];
  users: User[];
  phoneNumbers: PhoneNumber[];
  settings: PhoneSettings[];
  calls: Call[];
  voicemails: Voicemail[];
  clients: Client[];
  resets: { token: string; userId: string; expiresAt: number }[];
}

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
  };
  private readonly file = process.env.DB_FILE || path.resolve(process.cwd(), 'data.json');

  onModuleInit() {
    this.load();
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
  }): { account: Account; user: User } {
    const account: Account = {
      id: randomUUID(),
      companyName: input.companyName,
      country: 'FR',
      plan: input.plan || 'starter',
      status: input.status || 'trial',
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

  // ── Numéros & réglages ─────────────────────────────────────────────────────

  countByE164(accountId: string, e164: string): number {
    return this.data.phoneNumbers.filter((n) => n.accountId === accountId && n.e164 === e164).length;
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

  createVoicemail(input: { callId: string; audioUrl?: string | null }) {
    const vm: Voicemail = {
      id: randomUUID(),
      callId: input.callId,
      audioUrl: input.audioUrl ?? null,
      transcriptionStatus: 'pending',
      isRead: false,
      createdAt: this.now(),
    };
    this.data.voicemails.push(vm);
    this.save();
    return vm;
  }

  listVoicemails(accountId: string) {
    const callIds = new Set(this.data.calls.filter((c) => c.accountId === accountId).map((c) => c.id));
    return this.data.voicemails
      .filter((v) => callIds.has(v.callId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => ({ ...v, call: this.data.calls.find((c) => c.id === v.callId) }));
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

  /** Récupération : liste des emails enregistrés (temporaire, protégé par clé). */
  listUserEmails() {
    return this.data.users.map((u) => {
      const acc = this.data.accounts.find((a) => a.id === u.accountId);
      return { email: u.email, entreprise: acc?.companyName, créé: u.createdAt };
    });
  }

  // util pour le seed
  hasUser(email: string) {
    return this.data.users.some((u) => u.email === email.toLowerCase());
  }
}
