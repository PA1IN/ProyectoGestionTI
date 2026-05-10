import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TarjetaService } from './tarjeta.service';
import { TarjetaController } from './tarjeta.controller';
import { Tarjeta } from './entities/tarjeta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tarjeta])],
  controllers: [TarjetaController],
  providers: [TarjetaService],
  exports: [TarjetaService],
})
export class TarjetaModule {}
