import { Body, Controller, Delete, Patch, Post, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { StripeService } from './stripe.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/**
 * SUPPRESSION DE COMPTE — exigence App Store (guideline 5.1.1) et droit à
 * l'effacement RGPD. Vérifie le mot de passe puis, dans l'ordre :
 * annule l'abonnement Stripe, libère les numéros chez Telnyx (on arrête de
 * payer), efface les données du compte (factures conservées : obligation
 * comptable).
 */
@UseGuards(JwtGuard)
@Controller('account')
export class AccountController {
  constructor(
    private readonly db: DbService,
    private readonly stripe: StripeService,
    private readonly telnyx: TelnyxService,
  ) {}

  /**
   * Changement de formule SYNCHRONISÉ avec Stripe : si un prélèvement
   * automatique est actif, son montant passe à la nouvelle formule (prorata)
   * AVANT le changement — impossible d'avoir Business au prix d'Essentiel.
   */
  @Patch('plan')
  async changePlan(@CurrentUser() user: JwtPayload, @Body() body: { plan?: string }) {
    const plan = this.db.listPlans().find((p) => p.active && p.key === body?.plan);
    if (!plan) return { error: 'Formule inconnue' };
    const account = this.db.findAccountById(user.accountId);
    if (!account) return { error: 'Compte introuvable' };
    if (account.plan === plan.key) return { plan: account.plan };
    if (account.stripeSubscriptionId && this.stripe.configured) {
      const newHt = Math.round(plan.monthlyPrice * (1 - (account.discountPct || 0) / 100) * 100) / 100;
      try {
        await this.stripe.updateSubscriptionPlan(account.stripeSubscriptionId, plan.name, newHt);
      } catch (e) {
        return { error: `Changement impossible pour le moment : ${(e as Error).message}` };
      }
    }
    const a = this.db.updateAccountPlan(user.accountId, plan.key);
    return { plan: a?.plan };
  }

  /**
   * RÉSILIATION « en un clic » (promesse CGV) : plus aucun prélèvement, la
   * ligne reste active jusqu'à la fin de la période déjà payée, puis le
   * numéro est conservé 15 jours avant libération (LifecycleService).
   */
  @Post('cancel')
  async cancel(@CurrentUser() user: JwtPayload) {
    const account = this.db.findAccountById(user.accountId);
    if (!account) return { error: 'Compte introuvable' };
    if (account.cancelEffectiveAt) {
      return { ok: true, effectiveAt: account.cancelEffectiveAt, already: true };
    }
    if (!account.stripeSubscriptionId) {
      return { error: "Aucun abonnement actif à résilier." };
    }
    let effectiveAt: string;
    try {
      effectiveAt = await this.stripe.cancelAtPeriodEnd(account.stripeSubscriptionId);
    } catch (e) {
      return { error: `Résiliation impossible pour le moment : ${(e as Error).message}` };
    }
    this.db.setAccountLifecycle(user.accountId, { cancelEffectiveAt: effectiveAt });
    return { ok: true, effectiveAt };
  }

  @Delete()
  async remove(@CurrentUser() user: JwtPayload, @Body() body: { password?: string }) {
    const u = this.db.findUserById(user.sub);
    if (!u) return { error: 'Utilisateur introuvable' };
    const ok = await bcrypt.compare(body?.password || '', u.passwordHash);
    if (!ok) return { error: 'Mot de passe incorrect' };

    const account = this.db.findAccountById(user.accountId);
    if (account?.stripeSubscriptionId && this.stripe.configured) {
      try {
        await this.stripe.cancelSubscription(account.stripeSubscriptionId);
      } catch {
        /* abonnement déjà annulé côté Stripe : on continue */
      }
    }
    // Libération des numéros AVANT l'effacement (on arrête de les payer) ;
    // un échec Telnyx ne bloque pas la suppression demandée par le client.
    for (const n of this.db.listPhoneNumbers(user.accountId)) {
      if (n.providerNumberId) {
        try {
          await this.telnyx.releaseNumber(n.providerNumberId);
        } catch {
          /* numéro déjà libéré ou API indisponible */
        }
      }
    }
    this.db.deleteAccount(user.accountId);
    return { ok: true };
  }
}
