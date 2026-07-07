import { Body, Controller, Delete, UseGuards } from '@nestjs/common';
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
