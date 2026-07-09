import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TarjetaService } from './tarjeta.service';
import { TarjetaController } from './tarjeta.controller';
import { Tarjeta } from './entities/tarjeta.entity';
import { ComerciosModule } from '../comercios/comercios.module';
import { PagoMerchantAuthGuard } from '../pago/guards/pago-merchant-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tarjeta]), ComerciosModule],
  controllers: [TarjetaController],
  providers: [TarjetaService, PagoMerchantAuthGuard],
  exports: [TarjetaService],
})
export class TarjetaModule {}
