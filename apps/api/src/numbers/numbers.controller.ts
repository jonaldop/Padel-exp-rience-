import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { TelnyxService } from '../telnyx/telnyx.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/**
 * Provisioning et configuration des numéros pour le compte du client connecté.
 * Le client achète "chez nous" -> notre back appelle Telnyx avec NOTRE clé,
 * puis attribue le numéro à son compte (docs/04, tickets NUM-1, FLOW-1).
 */
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
    return this.db.listPhoneNumbers(user.accountId);
  }

  /** Acheter un nouveau numéro et l'attribuer au compte. */
  @Post('buy')
  async buy(@CurrentUser() user: JwtPayload, @Body() body: { e164: string; type?: string }) {
    let providerNumberId: string | null = null;
    if (this.telnyx.configured) {
      const res = await this.telnyx.buyNumber(body.e164);
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
      'ringTimeoutS',
      'forwardToMobile',
      'forwardNumber',
      'voicemailEnabled',
      'recordingEnabled',
      'aiEnabled',
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
