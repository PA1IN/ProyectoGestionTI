import { NestFactory } from '@nestjs/core';
import { ConciliacionModule } from './conciliacion.module';

async function bootstrap() {
  const app = await NestFactory.create(ConciliacionModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
