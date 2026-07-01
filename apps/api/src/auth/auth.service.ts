import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';
import { config } from '../config/config';

export interface JwtPayload {
  sub: string; // userId
  accountId: string;
  role: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Inscription d'un nouveau CLIENT : crée l'entreprise (Account) + son
   * utilisateur propriétaire (owner). Le client s'inscrit chez NOUS (docs/03).
   */
  async register(input: {
    email: string;
    password: string;
    companyName: string;
    firstName?: string;
    lastName?: string;
  }) {
    if (this.db.findUserByEmail(input.email)) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const { account, user } = this.db.createAccountWithOwner({
      companyName: input.companyName,
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return this.sign(user, account);
  }

  async login(email: string, password: string) {
    const user = this.db.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');
    // Suspension réelle : un compte suspendu/résilié ne peut plus se connecter.
    if (user.account?.status === 'suspended') {
      throw new UnauthorizedException('Compte suspendu. Contactez le support.');
    }
    if (user.account?.status === 'canceled') {
      throw new UnauthorizedException('Compte résilié. Contactez le support.');
    }
    return this.sign(user, user.account);
  }

  /**
   * Demande de réinitialisation. Renvoie toujours { ok: true } (ne révèle pas si
   * l'email existe). Envoie un email si Resend est configuré ; sinon renvoie le
   * lien directement (mode dépannage pour un usage solo).
   */
  async forgotPassword(email: string) {
    const user = this.db.findUserByEmail(email);
    if (!user) return { ok: true };

    const token = this.db.createPasswordReset(user.id);
    const resetUrl = `${config.webOrigin}/?reset=${token}`;

    if (config.email.configured) {
      try {
        await this.sendResetEmail(user.email, resetUrl);
        return { ok: true };
      } catch (e) {
        this.logger.error(`Envoi email reset échoué: ${(e as Error).message}`);
      }
    }
    // Mode dépannage (email non configuré) : on renvoie le lien.
    this.logger.warn(`Reset (email non configuré) pour ${user.email}: ${resetUrl}`);
    return { ok: true, devResetUrl: resetUrl };
  }

  async resetPassword(token: string, password: string) {
    if (!password || password.length < 8) {
      throw new BadRequestException('Mot de passe trop court (8 caractères min)');
    }
    const userId = this.db.consumePasswordReset(token);
    if (!userId) throw new BadRequestException('Lien invalide ou expiré');
    const hash = await bcrypt.hash(password, 10);
    this.db.setUserPassword(userId, hash);
    return { ok: true };
  }

  private async sendResetEmail(to: string, resetUrl: string) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.email.from,
        to,
        subject: 'Réinitialisation de votre mot de passe — Joe',
        html: `<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
<p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a> (lien valable 30 minutes).</p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  }

  private sign(user: any, account: any) {
    const payload: JwtPayload = {
      sub: user.id,
      accountId: account.id,
      role: user.role,
      email: user.email,
    };
    return {
      token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      account: {
        id: account.id,
        companyName: account.companyName,
        plan: account.plan,
        status: account.status,
      },
    };
  }
}
