import { Controller, Get, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { config } from '../config/config';

/**
 * Back-office propriétaire du SaaS : voir tous les comptes clients.
 * Protégé par une clé admin (ADMIN_KEY en variable d'env, ou par défaut).
 */
@Controller('admin')
export class AdminController {
  constructor(private readonly db: DbService) {}

  private check(key?: string) {
    if (!key || key !== config.adminKey) throw new UnauthorizedException('Clé admin invalide');
  }

  @Get('accounts')
  accounts(@Query('key') key: string, @Headers('x-admin-key') header: string) {
    this.check(key || header);
    const accounts = this.db.adminListAccounts();
    return { count: accounts.length, accounts };
  }
}
