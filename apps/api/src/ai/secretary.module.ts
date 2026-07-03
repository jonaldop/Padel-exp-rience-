import { Module } from '@nestjs/common';
import { SecretaryService } from './secretary.service';
import { DbModule } from '../db/db.module';

/** Secrétariat IA : analyse des messages vocaux (docs/08 AI-1). */
@Module({
  imports: [DbModule],
  providers: [SecretaryService],
  exports: [SecretaryService],
})
export class SecretaryModule {}
