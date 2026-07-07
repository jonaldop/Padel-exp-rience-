import { Module } from '@nestjs/common';
import { NumbersController, PublicNumbersController } from './numbers.controller';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { AuthModule } from '../auth/auth.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TelnyxModule, AuthModule, BillingModule],
  controllers: [NumbersController, PublicNumbersController],
})
export class NumbersModule {}
