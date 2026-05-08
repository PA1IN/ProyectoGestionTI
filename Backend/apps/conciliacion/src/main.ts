import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ConciliacionModule } from './conciliacion.module';

async function bootstrap() {
  const app = await NestFactory.create(ConciliacionModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT_CONCILIACION') || 3002;
  await app.listen(port);
}
bootstrap();
