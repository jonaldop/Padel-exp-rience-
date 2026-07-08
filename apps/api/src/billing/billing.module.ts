import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { AccountController } from './account.controller';
import { StripeService } from './stripe.service';
import { AuthModule } from '../auth/auth.module';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { PushModule } from '../push/push.module';
import { LifecycleService } from './lifecycle.service';

@Module({
  imports: [AuthModule, TelnyxModule, PushModule],
  controllers: [BillingController, AccountController],
  providers: [StripeService, LifecycleService],
  exports: [StripeService],
})
export class BillingModule {}
