import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS pour le softphone web (en prod : restreindre à l'origine du front)
  app.enableCors({ origin: true, credentials: true });

  await app.listen(config.port);
  Logger.log(`API démarrée sur http://localhost:${config.port}`, 'Bootstrap');
  Logger.log(`Webhook Telnyx à configurer sur: ${config.publicApiUrl}/calls/webhook`, 'Bootstrap');
}

bootstrap();
