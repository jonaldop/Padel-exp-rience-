import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';
import { TelnyxModule } from '../telnyx/telnyx.module';

@Module({
  imports: [AuthModule, TelnyxModule], // JwtService (auth) + TelnyxService (push iOS)
  controllers: [AdminController],
})
export class AdminModule {}
