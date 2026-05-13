import { Module } from '@nestjs/common';
import { ConfigModule } from '@libs/config';
import { ConciliacionController } from './conciliacion.controller';
import { ConciliacionService } from './conciliacion.service';

@Module({
  imports: [ConfigModule],
  controllers: [ConciliacionController],
  providers: [ConciliacionService],
})
export class ConciliacionModule {}
