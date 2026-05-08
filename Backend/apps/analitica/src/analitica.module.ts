import { Module } from '@nestjs/common';
import { ConfigModule } from '@libs/config';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';

@Module({
  imports: [ConfigModule],
  controllers: [AnaliticaController],
  providers: [AnaliticaService],
})
export class AnaliticaModule {}
