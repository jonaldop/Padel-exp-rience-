import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { TelnyxModule } from './telnyx/telnyx.module';
import { NumbersModule } from './numbers/numbers.module';
import { CallsModule } from './calls/calls.module';
import { ClientsModule } from './clients/clients.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule, AuthModule, TelnyxModule, NumbersModule, CallsModule, ClientsModule],
  controllers: [HealthController],
})
export class AppModule {}
