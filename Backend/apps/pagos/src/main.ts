import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PagosModule } from './pagos.module';

async function bootstrap() {
  const app = await NestFactory.create(PagosModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT_PAGOS') || 3001;
  await app.listen(port);
}
bootstrap();
