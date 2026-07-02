import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  // JwtService (auth) + TelnyxService (push iOS) + StripeService (réglages paiement)
  imports: [AuthModule, TelnyxModule, BillingModule],
  controllers: [AdminController],
})
export class AdminModule {}
