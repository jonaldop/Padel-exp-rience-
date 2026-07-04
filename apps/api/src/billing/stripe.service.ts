import { Injectable, Logger } from '@nestjs/common';
import { Account, DbService, Invoice } from '../db/db.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { config } from '../config/config';

/**
 * Connecteur Stripe (paiement des factures via Stripe Checkout).
 *
 * La clé secrète vient soit de l'env STRIPE_SECRET_KEY, soit du réglage posé
 * depuis le back-office admin (Réglages → Stripe). Aucune dépendance npm :
 * l'API Stripe s'appelle en HTTP form-encoded.
 */
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    private readonly db: DbService,
    private readonly telnyx: TelnyxService,
  ) {}

  /** Clé secrète active (env prioritaire, sinon réglage back-office). */
  get secretKey(): string {
    return process.env.STRIPE_SECRET_KEY || this.db.getSetting('stripeSecretKey');
  }

  /**
   * Compte ciblé (acct_…) : obligatoire avec une clé « organisation »
   * (sk_org_…) qui dessert plusieurs comptes Stripe.
   */
  get accountContext(): string {
    return process.env.STRIPE_ACCOUNT_ID || this.db.getSetting('stripeAccountId') || '';
  }

  get configured(): boolean {
    return Boolean(this.secretKey);
  }

  private async api<T = any>(pathname: string, params?: Record<string, string>): Promise<T> {
    const res = await fetch(`https://api.stripe.com/v1${pathname}`, {
      method: params ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        // Version d'API épinglée : obligatoire avec les clés « organisation »
        // (sk_org_…), qui n'ont pas de version par défaut. Version stable dont
        // les champs correspondent à ce que lit notre code (invoice.subscription,
        // subscription_details.metadata, checkout sessions…).
        'Stripe-Version': '2024-06-20',
        // Clé organisation : préciser le compte cible.
        ...(this.secretKey.startsWith('sk_org_') && this.accountContext
          ? { 'Stripe-Context': this.accountContext }
          : {}),
        ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: params ? new URLSearchParams(params).toString() : undefined,
    });
    const json = (await res.json()) as any;
    if (!res.ok) {
      const msg = json?.error?.message || `Stripe ${res.status}`;
      this.logger.warn(`Stripe ${pathname} -> ${msg}`);
      throw new Error(msg);
    }
    return json as T;
  }

  /** Vérifie la clé en appelant l'API (utilisé au moment de l'enregistrer). */
  async verifyKey(): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.api('/balance');
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  /** Crée une session Stripe Checkout pour payer une facture. Renvoie l'URL. */
  async checkoutForInvoice(invoice: Invoice, customerEmail?: string): Promise<{ url: string }> {
    const base = config.publicApiUrl;
    const session = await this.api<{ url: string; id: string }>('/checkout/sessions', {
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(Math.round(invoice.total * 100)),
      'line_items[0][price_data][product_data][name]': `Abonnement Joe — ${invoice.planName} (${invoice.period})`,
      'line_items[0][price_data][product_data][description]': `Facture ${invoice.number}`,
      'metadata[invoiceId]': invoice.id,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      // Au retour du paiement, notre page de succès VÉRIFIE la session auprès de
      // Stripe et marque la facture payée (fonctionne même sans webhook).
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/cancel`,
    });
    return { url: session.url };
  }

  /**
   * ABONNEMENT : crée une session Checkout en mode subscription (carte
   * enregistrée, prélèvement automatique chaque mois du prix effectif
   * de la formule — remise incluse). Renvoie l'URL de souscription.
   */
  async subscribeForAccount(account: Account, planName: string, monthlyAmount: number, customerEmail?: string): Promise<{ url: string }> {
    const base = config.publicApiUrl;
    const session = await this.api<{ url: string }>('/checkout/sessions', {
      mode: 'subscription',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(Math.round(monthlyAmount * 100)),
      'line_items[0][price_data][recurring][interval]': 'month',
      'line_items[0][price_data][product_data][name]': `Joe — Formule ${planName} (mensuel)`,
      'metadata[accountId]': account.id,
      'subscription_data[metadata][accountId]': account.id,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/billing/cancel`,
    });
    return { url: session.url };
  }

  /**
   * Vérifie une session Checkout auprès de Stripe et applique le résultat :
   * - mode payment : marque la facture (metadata.invoiceId) payée ;
   * - mode subscription : lie l'abonnement au compte, l'active et enregistre
   *   la facture payée du mois. Sûr : on relit toujours la session chez Stripe.
   */
  async confirmSession(sessionId: string): Promise<{ paid: boolean }> {
    const s = await this.api<any>(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    const paid = s?.payment_status === 'paid';
    if (!paid) return { paid: false };

    if (s.mode === 'subscription') {
      const accountId = s?.metadata?.accountId;
      if (accountId) {
        this.db.setAccountStripe(accountId, s.customer || null, s.subscription || null);
        this.db.updateAccountStatus(accountId, 'active');
        const period = new Date().toISOString().slice(0, 7);
        this.db.recordPaidInvoice(accountId, period, (s.amount_total || 0) / 100);
        this.logger.log(`Abonnement Stripe activé pour le compte ${accountId} (${s.subscription})`);
        // Le numéro réservé à l'inscription est acheté MAINTENANT (client payant).
        await this.activatePendingNumber(accountId);
      }
    } else {
      const invoiceId = s?.metadata?.invoiceId;
      if (invoiceId) {
        this.db.setInvoiceStatus(invoiceId, 'paid');
        this.logger.log(`Facture ${invoiceId} payée via Stripe (${sessionId})`);
      }
    }
    return { paid: true };
  }

  /**
   * Prélèvement récurrent : vérifie une facture Stripe (webhook invoice.paid)
   * et crée/marque payée la facture interne du mois correspondant.
   */
  async confirmStripeInvoice(stripeInvoiceId: string): Promise<void> {
    const inv = await this.api<any>(`/invoices/${encodeURIComponent(stripeInvoiceId)}`);
    if (!(inv?.paid || inv?.status === 'paid')) return;
    const subId = typeof inv.subscription === 'string' ? inv.subscription : inv?.subscription?.id;
    const accountId = inv?.subscription_details?.metadata?.accountId
      || (subId ? this.db.findAccountBySubscription(subId)?.id : null);
    if (!accountId) return;
    const ts = (inv.period_end || inv.created) * 1000;
    const period = new Date(ts).toISOString().slice(0, 7);
    this.db.recordPaidInvoice(accountId, period, (inv.amount_paid || 0) / 100);
    // Un paiement réussi remet le compte en règle.
    const acc = this.db.findAccountById(accountId);
    if (acc && acc.status === 'past_due') this.db.updateAccountStatus(accountId, 'active');
    this.logger.log(`Prélèvement Stripe encaissé : compte ${accountId}, période ${period}`);
    // Filet de sécurité : si le webhook arrive avant la page de succès.
    await this.activatePendingNumber(accountId);
  }

  /**
   * Achète chez Telnyx le numéro réservé à l'inscription (pendingNumber),
   * une fois le paiement confirmé. Idempotent : le pending est effacé après
   * achat, un second appel ne fait rien.
   */
  async activatePendingNumber(accountId: string): Promise<void> {
    const acc = this.db.findAccountById(accountId);
    const pending = acc?.pendingNumber;
    if (!pending?.e164) return;
    if (this.db.e164OwnedByOtherAccount(accountId, pending.e164)) {
      // Pris entre-temps : on efface, le client choisira un autre numéro
      // depuis son espace (cas rarissime).
      this.db.setPendingNumber(accountId, null);
      this.logger.warn(`Numéro réservé ${pending.e164} déjà pris — compte ${accountId} devra rechoisir`);
      return;
    }
    let providerNumberId: string | null = null;
    if (this.telnyx.configured) {
      try {
        const res = await this.telnyx.buyNumber(pending.e164, accountId);
        providerNumberId = res.providerNumberId;
      } catch (e) {
        // Achat Telnyx échoué (numéro retiré du stock…) : on garde le pending
        // pour re-tenter au prochain paiement/webhook, et on alerte dans les logs.
        this.logger.error(`Achat Telnyx échoué pour ${pending.e164} (compte ${accountId}) : ${(e as Error).message}`);
        return;
      }
    }
    this.db.createPhoneNumber({
      accountId,
      e164: pending.e164,
      type: pending.type,
      providerNumberId,
      origin: 'new',
      status: 'active',
    });
    this.db.setPendingNumber(accountId, null);
    this.logger.log(`Numéro ${pending.e164} activé après paiement (compte ${accountId})`);
  }

  /** Échec de prélèvement : passe le compte en impayé (après re-vérification). */
  async handleFailedInvoice(stripeInvoiceId: string): Promise<void> {
    const inv = await this.api<any>(`/invoices/${encodeURIComponent(stripeInvoiceId)}`);
    if (inv?.paid) return; // finalement payé -> rien à faire
    const subId = typeof inv.subscription === 'string' ? inv.subscription : inv?.subscription?.id;
    const acc = subId ? this.db.findAccountBySubscription(subId) : null;
    if (acc) {
      this.db.updateAccountStatus(acc.id, 'past_due');
      this.logger.warn(`Prélèvement Stripe ÉCHOUÉ : compte ${acc.id} passé en impayé`);
    }
  }
}
