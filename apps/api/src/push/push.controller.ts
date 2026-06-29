import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

@UseGuards(JwtGuard)
@Controller('push')
export class PushController {
  constructor(private readonly db: DbService) {}

  /** Enregistre le token push de l'appareil de l'utilisateur connecté. */
  @Post('register')
  register(@CurrentUser() user: JwtPayload, @Body() body: { token: string; platform?: string }) {
    const d = this.db.registerDevice(user.accountId, user.sub, body.token, body.platform || 'ios');
    return { ok: !!d };
  }
}
