import { Module } from '@nestjs/common';
import { TelnyxModule } from './telnyx/telnyx.module';
import { CallsModule } from './calls/calls.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TelnyxModule, CallsModule],
  controllers: [HealthController],
})
export class AppModule {}
