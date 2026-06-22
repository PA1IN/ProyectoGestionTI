import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  
  const port = process.env.PORT || configService.get<number>('PORT_GATEWAY') || 3004;

  await app.listen(port, '0.0.0.0');
  console.log(`API Gateway corriendo en el puerto: ${port}`);
}

bootstrap();