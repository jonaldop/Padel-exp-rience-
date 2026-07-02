import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { StripeService } from './stripe.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/** Paiement des factures d'abonnement via Stripe Checkout. */
@Controller('billing')
export class BillingController {
  constructor(
    private readonly db: DbService,
    private readonly stripe: StripeService,
  ) {}

  /** Paiement en ligne activé ? Abonnement auto déjà en place sur ce compte ? */
  @UseGuards(JwtGuard)
  @Get('status')
  status(@CurrentUser() user: JwtPayload) {
    const account = this.db.findUserById(user.sub)?.account;
    return {
      enabled: this.stripe.configured,
      subscribed: Boolean(account?.stripeSubscriptionId),
    };
  }

  /**
   * ABONNEMENT : met en place le prélèvement automatique mensuel de la formule
   * courante (Stripe Checkout, carte enregistrée). Les factures suivantes se
   * créent toutes seules, déjà payées, à chaque prélèvement.
   */
  @UseGuards(JwtGuard)
  @Post('subscribe')
  async subscribe(@CurrentUser() user: JwtPayload) {
    if (!this.stripe.configured) {
      return { error: "Le paiement en ligne n'est pas encore activé." };
    }
    const u = this.db.findUserById(user.sub);
    const account = u?.account;
    if (!account) return { error: 'Compte introuvable' };
    if (account.stripeSubscriptionId) return { error: 'Le prélèvement automatique est déjà en place.' };
    const price = this.db.effectivePrice(account);
    if (!price) return { error: "Choisissez d'abord une formule payante." };
    const planName = this.db.listPlans().find((p) => p.key === account.plan)?.name || account.plan;
    try {
      const { url } = await this.stripe.subscribeForAccount(account, planName, price, u?.email);
      return { url };
    } catch (e) {
      return { error: `Stripe : ${(e as Error).message}` };
    }
  }

  /** Crée une session de paiement pour une facture "à payer" du compte. */
  @UseGuards(JwtGuard)
  @Post('checkout')
  async checkout(@CurrentUser() user: JwtPayload, @Body() body: { invoiceId?: string }) {
    if (!this.stripe.configured) {
      return { error: "Le paiement en ligne n'est pas encore activé." };
    }
    const invoice = this.db
      .listInvoices(user.accountId)
      .find((i) => i.id === body.invoiceId);
    if (!invoice) return { error: 'Facture introuvable' };
    if (invoice.status === 'paid') return { error: 'Cette facture est déjà payée.' };
    if (invoice.status === 'void') return { error: 'Cette facture est annulée.' };
    try {
      const u = this.db.findUserById(user.sub);
      const { url } = await this.stripe.checkoutForInvoice(invoice, u?.email);
      return { url };
    } catch (e) {
      return { error: `Stripe : ${(e as Error).message}` };
    }
  }

  /** Retour de Stripe après paiement : vérifie la session et marque payée. */
  @Get('success')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async success(@Query('session_id') sessionId?: string) {
    let ok = false;
    if (sessionId && this.stripe.configured) {
      try {
        ok = (await this.stripe.confirmSession(sessionId)).paid;
      } catch {
        ok = false;
      }
    }
    return page(
      ok ? '✅ Paiement confirmé' : '⏳ Paiement en cours de confirmation',
      ok
        ? 'Merci ! Votre facture est réglée. Vous pouvez fermer cette page et revenir dans l’application Joe.'
        : 'Votre paiement est en cours de traitement. Il apparaîtra comme réglé dans quelques instants dans l’application Joe.',
    );
  }

  /** Annulation du paiement par le client. */
  @Get('cancel')
  @Header('Content-Type', 'text/html; charset=utf-8')
  cancel() {
    return page('Paiement annulé', 'Aucun montant n’a été débité. Vous pouvez fermer cette page et réessayer depuis l’application Joe.');
  }

  /**
   * Webhook Stripe : prélèvements récurrents (facture payée à chaque
   * prélèvement mensuel), échecs de paiement, et filet de sécurité checkout.
   * On ne fait jamais confiance au corps reçu : chaque objet est relu chez
   * Stripe avec notre clé avant d'agir.
   */
  @Post('webhook')
  async webhook(@Body() body: any) {
    try {
      if (!this.stripe.configured) return { received: true };
      const type = body?.type;
      const objectId = body?.data?.object?.id;
      if (!objectId) return { received: true };
      if (type === 'checkout.session.completed') {
        await this.stripe.confirmSession(objectId);
      } else if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') {
        await this.stripe.confirmStripeInvoice(objectId);
      } else if (type === 'invoice.payment_failed') {
        await this.stripe.handleFailedInvoice(objectId);
      }
    } catch {
      /* toujours répondre 200 à Stripe */
    }
    return { received: true };
  }
}

function page(title: string, text: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — Joe</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:linear-gradient(135deg,#6C5CE7,#a29bfe);min-height:100vh;display:flex;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:20px;padding:36px 30px;max-width:420px;margin:20px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25)">
<div style="font-size:44px;margin-bottom:10px">📞</div>
<h1 style="font-size:22px;margin:0 0 10px">${title}</h1>
<p style="color:#555;font-size:15px;line-height:1.5;margin:0">${text}</p>
</div></body></html>`;
}
