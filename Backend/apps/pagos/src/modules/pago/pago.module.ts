import { Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { TarjetaModule } from '../tarjeta/tarjeta.module';
import { AuthModule } from '../../auth/auth.module';
import { Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaccion } from './entities/transaccion.entity';
import { DetalleTransaccion } from './entities/detalle-transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';

@Module({
  imports: [TarjetaModule, AuthModule, TypeOrmModule.forFeature([Tarjeta, Transaccion, DetalleTransaccion, HistorialTransaccion])],
  controllers: [PagoController],
  providers: [PagoService],
})
export class PagoModule {}
