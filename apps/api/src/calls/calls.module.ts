import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { AuthModule } from '../auth/auth.module';
import { PushModule } from '../push/push.module';
import { SecretaryModule } from '../ai/secretary.module';

@Module({
  imports: [TelnyxModule, AuthModule, PushModule, SecretaryModule],
  controllers: [CallsController],
})
export class CallsModule {}
