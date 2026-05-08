import { NestFactory } from '@nestjs/core';
import { AnaliticaModule } from './analitica.module';

async function bootstrap() {
  const app = await NestFactory.create(AnaliticaModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
