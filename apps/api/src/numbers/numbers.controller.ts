import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { SecretaryService } from '../ai/secretary.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/**
 * Provisioning et configuration des numéros pour le compte du client connecté.
 * Le client achète "chez nous" -> notre back appelle Telnyx avec NOTRE clé,
 * puis attribue le numéro à son compte (docs/04, tickets NUM-1, FLOW-1).
 */
/**
 * Recherche PUBLIQUE de numéros disponibles : utilisée par le tunnel
 * d'inscription (site + app) AVANT la création du compte — le client choisit
 * son numéro d'abord, il n'est réellement acheté qu'une fois le compte créé.
 */
@Controller('public/numbers')
export class PublicNumbersController {
  constructor(private readonly telnyx: TelnyxService) {}

  @Get('available')
  available(@Query('type') type?: string, @Query('contains') contains?: string) {
    return this.telnyx.searchAvailableNumbers({ country: 'FR', type, contains, limit: 20 });
  }
}

@UseGuards(JwtGuard)
@Controller('numbers')
export class NumbersController {
  constructor(
    private readonly db: DbService,
    private readonly telnyx: TelnyxService,
  ) {}

  /** Catalogue de numéros disponibles à l'achat (recherche par type / chiffres). */
  @Get('available')
  available(@Query('type') type?: string, @Query('contains') contains?: string) {
    return this.telnyx.searchAvailableNumbers({ country: 'FR', type, contains, limit: 20 });
  }

  /** Liste des numéros du compte. */
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    // defaultGreetings : textes automatiques du secrétariat (affichés en
    // aperçu dans l'app quand aucun message personnalisé n'est défini).
    const company = this.db.findAccountById(user.accountId)?.companyName;
    return this.db.listPhoneNumbers(user.accountId).map((n: any) => ({
      ...n,
      defaultGreetings: {
        open: SecretaryService.greeting(company, false),
        closed: SecretaryService.greeting(company, true),
      },
    }));
  }

  /** Statut réel d'un numéro chez Telnyx (active / pending requirements...). */
  @Get(':id/status')
  async status(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const n = this.db.findPhoneNumber(user.accountId, id);
    if (!n) return { status: 'unknown' };
    if (!n.providerNumberId || !this.telnyx.configured) return { status: n.status };
    const live = await this.telnyx.getNumberStatus(n.providerNumberId);
    return { status: live?.status || n.status };
  }

  /**
   * Importer dans le compte les numéros déjà possédés sur Telnyx (resync).
   *
   * SÉCURITÉ MULTI-TENANT : on n'importe QUE les numéros qui appartiennent
   * réellement à ce compte. Un numéro est éligible si :
   *   - il est étiqueté chez Telnyx avec customer_reference == ce compte, OU
   *   - c'est un "orphelin" (jamais étiqueté) ET aucun autre compte chez nous
   *     ne le revendique déjà (cas des numéros achetés avant l'étiquetage).
   * On n'importe JAMAIS le numéro d'un autre compte.
   */
  @Post('import')
  async import(@CurrentUser() user: JwtPayload) {
    if (!this.telnyx.configured) return { imported: 0 };
    const owned = await this.telnyx.listOwnedNumbers();
    const existing = new Set(this.db.listPhoneNumbers(user.accountId).map((n) => n.e164));
    let imported = 0;
    let skipped = 0;
    for (const n of owned) {
      if (existing.has(n.e164)) continue;

      const taggedToMe = n.ownerRef && n.ownerRef === user.accountId;
      const orphan = !n.ownerRef && !this.db.e164OwnedByOtherAccount(user.accountId, n.e164);
      if (!taggedToMe && !orphan) {
        // Appartient à un autre compte (étiqueté ou déjà revendiqué) -> on ignore.
        skipped++;
        continue;
      }

      try {
        // Route vers notre app ET étiquette le numéro à ce compte.
        await this.telnyx.routeNumberToApp(n.providerNumberId, user.accountId);
      } catch {
        /* on importe quand même côté base */
      }
      this.db.createPhoneNumber({
        accountId: user.accountId,
        e164: n.e164,
        type: n.type,
        providerNumberId: n.providerNumberId,
      });
      imported++;
    }
    return { imported, skipped };
  }

  /** Acheter un nouveau numéro et l'attribuer au compte. */
  @Post('buy')
  async buy(@CurrentUser() user: JwtPayload, @Body() body: { e164: string; type?: string }) {
    // Sécurité : on refuse l'achat d'un numéro déjà rattaché à un autre compte.
    if (this.db.e164OwnedByOtherAccount(user.accountId, body.e164)) {
      return { error: 'Ce numéro est déjà attribué à un autre compte.' };
    }
    // Garde-fou anti-abus : chaque numéro acheté nous coûte de l'argent chez
    // Telnyx. Pendant l'essai gratuit (sans CB), on limite à 1 numéro par
    // compte — le 2ᵉ numéro sera une option payante (V2).
    const account = this.db.findAccountById(user.accountId);
    const owned = this.db.listPhoneNumbers(user.accountId);
    if (account?.status === 'trial' && owned.length >= 1) {
      return {
        error:
          'Votre essai gratuit inclut 1 numéro pro. Activez votre abonnement pour ajouter des numéros supplémentaires.',
      };
    }
    let providerNumberId: string | null = null;
    if (this.telnyx.configured) {
      const res = await this.telnyx.buyNumber(body.e164, user.accountId);
      providerNumberId = res.providerNumberId;
    }
    return this.db.createPhoneNumber({
      accountId: user.accountId,
      e164: body.e164,
      type: body.type,
      providerNumberId,
      origin: 'new',
      status: 'active',
    });
  }

  /** Démarrer une demande de portabilité (numéro existant). */
  @Post('port')
  port(@CurrentUser() user: JwtPayload, @Body() body: { e164: string; rio?: string }) {
    // MVP : on enregistre la demande en "porting". Le traitement réel (mandat,
    // transmission à Telnyx) est un workflow à part (ticket NUM-2).
    return this.db.createPhoneNumber({
      accountId: user.accountId,
      e164: body.e164,
      origin: 'ported',
      status: 'porting',
    });
  }

  /** Mettre à jour les réglages d'un numéro (horaires, répondeur, renvoi...). */
  @Patch(':id/settings')
  updateSettings(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: any) {
    const number = this.db.findPhoneNumber(user.accountId, id);
    if (!number) return { error: 'Numéro introuvable' };

    const patch: any = {};
    for (const k of [
      'greetingOpen',
      'greetingClosed',
      'greetingVoice',
      'ringTimeoutS',
      'forwardToMobile',
      'forwardNumber',
      'voicemailEnabled',
      'recordingEnabled',
      'aiEnabled',
      'aiConversational',
      'ringInApp',
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    if (body.weeklySchedule !== undefined) {
      patch.weeklySchedule =
        typeof body.weeklySchedule === 'string'
          ? body.weeklySchedule
          : JSON.stringify(body.weeklySchedule);
    }
    if (body.holidays !== undefined) {
      patch.holidays =
        typeof body.holidays === 'string' ? body.holidays : JSON.stringify(body.holidays);
    }
    return this.db.updateSettings(id, patch);
  }
}
