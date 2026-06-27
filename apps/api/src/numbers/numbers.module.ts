import { Module } from '@nestjs/common';
import { NumbersController } from './numbers.controller';
import { TelnyxModule } from '../telnyx/telnyx.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TelnyxModule, AuthModule],
  controllers: [NumbersController],
})
export class NumbersModule {}
