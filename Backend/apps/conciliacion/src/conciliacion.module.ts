import { Module } from '@nestjs/common';
import { ConciliacionController } from './conciliacion.controller';
import { ConciliacionService } from './conciliacion.service';

@Module({
  imports: [],
  controllers: [ConciliacionController],
  providers: [ConciliacionService],
})
export class ConciliacionModule {}
