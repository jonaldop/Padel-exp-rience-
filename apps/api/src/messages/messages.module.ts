import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [TelnyxModule, AuthModule, PushModule],
  controllers: [MessagesController],
})
export class MessagesModule {}
