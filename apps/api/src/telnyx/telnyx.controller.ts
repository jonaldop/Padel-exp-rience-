import { Body, Controller, Post } from '@nestjs/common';
import { TelnyxService } from './telnyx.service';

/**
 * Endpoints utilisés par le softphone (web/mobile).
 *
 * ⚠️ MVP : pas encore d'auth. En prod, protéger par JWT et dériver `userTag`
 * de l'utilisateur authentifié (cf. tickets INFRA-3 / DEV-1).
 */
@Controller('telnyx')
export class TelnyxController {
  constructor(private readonly telnyx: TelnyxService) {}

  /** Le client appelle ceci au démarrage pour obtenir un token WebRTC court. */
  @Post('webrtc-token')
  async webrtcToken(@Body() body: { userTag?: string }) {
    const userTag = body?.userTag || 'demo-user';
    return this.telnyx.createWebrtcToken(userTag);
  }
}
