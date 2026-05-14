import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesamientoService } from './procesamiento.service';
import { ProcesamientoController } from './procesamiento.controller';
import { ConciliacionTemporal } from '../conciliacion.entity';
import { DiscrepanciaConciliacion } from './entities/discrepancia-conciliacion.entity';
import { ConciliacionService } from '../conciliacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConciliacionTemporal, DiscrepanciaConciliacion]),
  ],
  controllers: [ProcesamientoController],
  providers: [ProcesamientoService, ConciliacionService],
  exports: [ProcesamientoService, ConciliacionService],
})
export class ProcesamientoModule {}
