import { NestFactory } from '@nestjs/core';
import { PagosModule } from './pagos.module';

async function bootstrap() {
  const app = await NestFactory.create(PagosModule);
  await app.listen(process.env.port ?? 3001);
}
bootstrap();
