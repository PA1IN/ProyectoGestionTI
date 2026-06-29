import { NestFactory } from '@nestjs/core';
import { WebhooksWorkerModule } from './webhook-worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WebhooksWorkerModule);
  
  const logger = new Logger('WebhooksWorker');
  logger.log('Worker de Webhooks iniciado y escuchando RabbitMQ...');
}
bootstrap();