import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { LoginDto, RegisterDto } from './dto';
import { CurrentUser, JwtGuard } from './jwt.guard';
import { DbService } from '../db/db.service';
import { config } from '../config/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly db: DbService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('forgot')
  forgot(@Body() body: { email: string }) {
    return this.auth.forgotPassword(body.email || '');
  }

  @Post('reset')
  reset(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token || '', body.password || '');
  }

  /** Profil de l'utilisateur connecté (+ son compte). */
  @UseGuards(JwtGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    const dbUser = this.db.findUserById(user.sub);
    return {
      user: dbUser && {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        phonePerso: dbUser.phonePerso,
      },
      account: dbUser?.account,
    };
  }

  /** Met à jour les infos perso (prénom, nom, téléphone perso). */
  @UseGuards(JwtGuard)
  @Patch('profile')
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: { firstName?: string; lastName?: string; phonePerso?: string },
  ) {
    const u = this.db.updateUserProfile(user.sub, body);
    if (!u) return { error: 'Utilisateur introuvable' };
    return { firstName: u.firstName, lastName: u.lastName, phonePerso: u.phonePerso };
  }

  /** Forfait courant + consommation (mois en cours + historique). Espace client. */
  @UseGuards(JwtGuard)
  @Get('usage')
  usage(@CurrentUser() user: JwtPayload) {
    return this.db.accountUsage(user.accountId, config.costPerMinute);
  }

  /** Change la formule d'abonnement du compte (parmi les formules actives). */
  @UseGuards(JwtGuard)
  @Patch('plan')
  updatePlan(@CurrentUser() user: JwtPayload, @Body() body: { plan: string }) {
    const allowed = this.db.listPlans().filter((p) => p.active).map((p) => p.key);
    if (!allowed.includes(body.plan)) return { error: 'Formule inconnue' };
    const a = this.db.updateAccountPlan(user.accountId, body.plan);
    if (!a) return { error: 'Compte introuvable' };
    return { plan: a.plan };
  }
}
