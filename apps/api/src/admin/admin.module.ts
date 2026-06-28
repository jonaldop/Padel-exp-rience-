import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // pour disposer de JwtService (JwtModule exporté)
  controllers: [AdminController],
})
export class AdminModule {}
