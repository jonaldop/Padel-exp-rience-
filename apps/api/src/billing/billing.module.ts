import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { StripeService } from './stripe.service';
import { AuthModule } from '../auth/auth.module';
import { TelnyxModule } from '../telnyx/telnyx.module';

@Module({
  imports: [AuthModule, TelnyxModule],
  controllers: [BillingController],
  providers: [StripeService],
  exports: [StripeService],
})
export class BillingModule {}
