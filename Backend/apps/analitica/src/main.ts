import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AnaliticaModule } from './analitica.module';

async function bootstrap() {
  const app = await NestFactory.create(AnaliticaModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT_ANALITICA') || 3003;
  await app.listen(port);
}
bootstrap();
