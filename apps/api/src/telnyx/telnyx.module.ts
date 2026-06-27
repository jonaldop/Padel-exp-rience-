import { Module } from '@nestjs/common';
import { TelnyxService } from './telnyx.service';
import { TelnyxController } from './telnyx.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TelnyxController],
  providers: [TelnyxService],
  exports: [TelnyxService],
})
export class TelnyxModule {}
