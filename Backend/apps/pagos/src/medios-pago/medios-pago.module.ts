import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MandatoPago } from './entities/mandato-pago.entity';
import { TarjetaGuardada } from './entities/tarjeta-guardada.entity';
import { MediosPagoService } from './medios-pago.service';
import { MediosPagoController } from './medios-pago.controller';
import { CredencialComercio } from '../comercios/entities/credencial-comercio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TarjetaGuardada, MandatoPago, CredencialComercio])],
  controllers: [MediosPagoController],
  providers: [MediosPagoService],
  exports: [MediosPagoService],
})
export class MediosPagoModule {}