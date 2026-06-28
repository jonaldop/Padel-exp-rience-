import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, UnauthorizedException } from '@nestjs/common';
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
    const accounts = this.db.adminListAccounts(config.costPerMinute);
    return { count: accounts.length, accounts };
  }

  /** Tableau de bord : synthèse + solde Telnyx. */
  @Get('dashboard')
  async dashboard(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    const summary = this.db.adminSummary(config.costPerMinute);
    const telnyx = await this.telnyx.getBalance();
    return { summary, telnyx, costPerMinute: config.costPerMinute };
  }

  /** Diagnostic : décisions de routage des derniers appels entrants. */
  @Get('debug-calls')
  debugCalls(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    return { events: this.db.getInboundLog() };
  }

  /** Formules : lister. */
  @Get('plans')
  plans(@Headers('authorization') authorization: string, @Query('key') key: string) {
    this.authorize(authorization, key);
    return { plans: this.db.listPlans() };
  }

  /** Formules : créer / modifier. */
  @Patch('plans')
  upsertPlan(
    @Headers('authorization') authorization: string,
    @Body() body: { key: string; name?: string; monthlyPrice?: number; includedMinutes?: number; features?: string[]; active?: boolean },
  ) {
    this.authorize(authorization);
    if (!body.key) return { error: 'Clé de formule requise' };
    return this.db.upsertPlan(body);
  }

  /** Formules : supprimer. */
  @Delete('plans/:key')
  deletePlan(@Headers('authorization') authorization: string, @Param('key') key: string) {
    this.authorize(authorization);
    return { deleted: this.db.deletePlan(key) };
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
      // Tolérant : reconstruit un PEM propre même si l'en-tête/pied manque ou
      // si des lignes parasites ("Bag Attributes"…) traînent.
      const cert = normalizePem(body.certificate, 'cert');
      const key = normalizePem(body.privateKey, 'key');
      const res = await this.telnyx.setupIosPush(cert, key);
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

/**
 * Reconstruit un bloc PEM propre à partir d'un collage approximatif :
 * - si un bloc -----BEGIN…END----- existe, on le garde tel quel ;
 * - sinon on enveloppe le base64 (en-tête déduit du type cert/clé).
 */
function normalizePem(raw: string, kind: 'cert' | 'key'): string {
  const text = (raw || '').trim();
  const block = text.match(/-----BEGIN [\s\S]*?-----END [^-]+-----/);
  if (block) return block[0].trim() + '\n';

  const b64 = text.replace(/[^A-Za-z0-9+/=]/g, '');
  if (!b64) return text;
  const wrapped = (b64.match(/.{1,64}/g) || []).join('\n');

  let label = 'CERTIFICATE';
  if (kind === 'key') {
    // Clés RSA PKCS#1 (DER) commencent par MII…IBAAK ; PKCS#8 -> "PRIVATE KEY".
    label = /^MII[A-Za-z0-9+/]{0,6}IBAAK/.test(b64) ? 'RSA PRIVATE KEY' : 'PRIVATE KEY';
  }
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
}
