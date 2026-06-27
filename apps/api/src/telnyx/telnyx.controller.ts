import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  webrtcToken(@CurrentUser() user: JwtPayload) {
    return this.telnyx.createWebrtcToken(user.sub);
  }
}
