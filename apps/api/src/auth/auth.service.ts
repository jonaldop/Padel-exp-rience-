import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DbService } from '../db/db.service';

export interface JwtPayload {
  sub: string; // userId
  accountId: string;
  role: string;
  email: string;
}

@Injectable()
export class AuthService {
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
    return this.sign(user, user.account);
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
