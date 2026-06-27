import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsStore } from './calls.store';
import { TelnyxModule } from '../telnyx/telnyx.module';

@Module({
  imports: [TelnyxModule],
  controllers: [CallsController],
  providers: [CallsStore],
})
export class CallsModule {}
