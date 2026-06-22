import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MandatoPago } from './entities/mandato-pago.entity';
import { TarjetaGuardada } from './entities/tarjeta-guardada.entity';
import { MediosPagoService } from './medios-pago.service';

@Module({
  imports: [TypeOrmModule.forFeature([TarjetaGuardada, MandatoPago])],
  providers: [MediosPagoService],
  exports: [MediosPagoService],
})
export class MediosPagoModule {}