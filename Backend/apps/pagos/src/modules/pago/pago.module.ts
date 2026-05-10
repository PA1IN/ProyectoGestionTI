import { Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { TarjetaModule } from '../tarjeta/tarjeta.module';
import { AuthModule } from '../../auth/auth.module';
import { Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { TypeOrmModule } from '@nestjs/typeorm/dist/typeorm.module';

@Module({
  imports: [TarjetaModule, AuthModule, TypeOrmModule.forFeature([Tarjeta])],
  controllers: [PagoController],
  providers: [PagoService],
})
export class PagoModule {}
