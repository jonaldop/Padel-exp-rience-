import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(config.port);
  Logger.log(`API sur http://localhost:${config.port}`, 'Bootstrap');
  Logger.log(
    `Telnyx: ${config.telnyx.configured ? 'configuré ✅' : 'NON configuré (mode démo)'}`,
    'Bootstrap',
  );
  Logger.log(`Webhook entrant: ${config.publicApiUrl}/calls/webhook`, 'Bootstrap');
}
bootstrap();
