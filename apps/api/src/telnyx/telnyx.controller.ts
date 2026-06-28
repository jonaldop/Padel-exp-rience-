import { Body, Controller, Post, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { TelnyxService } from './telnyx.service';
import { CurrentUser, JwtGuard } from '../auth/jwt.guard';
import { JwtPayload } from '../auth/auth.service';

/** Endpoints du softphone (web/mobile). */
@Controller('telnyx')
export class TelnyxController {
  constructor(private readonly telnyx: TelnyxService) {}

  /** Token WebRTC court pour connecter le softphone (utilisateur authentifié). */
  @UseGuards(JwtGuard)
  @Post('webrtc-token')
  async webrtcToken(@CurrentUser() user: JwtPayload) {
    try {
      return await this.telnyx.createWebrtcToken(user.accountId);
    } catch (e) {
      // Remonte le détail Telnyx au client pour diagnostic
      throw new ServiceUnavailableException((e as Error).message);
    }
  }

  /**
   * Identifiants de connexion (login + mot de passe) pour la RÉCEPTION d'appels
   * entrants en WebRTC (les tokens jetables ne reçoivent pas d'entrants).
   */
  @UseGuards(JwtGuard)
  @Post('webrtc-credentials')
  async webrtcCredentials() {
    try {
      return await this.telnyx.ensureWebrtcCredentials();
    } catch (e) {
      throw new ServiceUnavailableException((e as Error).message);
    }
  }
}
