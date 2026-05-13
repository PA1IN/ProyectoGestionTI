import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { PagosModule } from './pagos.module';

async function bootstrap() {
  const app = await NestFactory.create(PagosModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT_PAGOS') || 3001;
  await app.listen(port);
}
bootstrap();
