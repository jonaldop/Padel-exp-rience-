import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    const accounts = this.db.adminListAccounts();
    return { count: accounts.length, accounts };
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
      const res = await this.telnyx.setupIosPush(body.certificate, body.privateKey);
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
