import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComerciosController } from './comercios.controller';
import { ComerciosService } from './comercios.service';
import { CredencialComercio } from './entities/credencial-comercio.entity';
import { PagoMerchantAuthGuard } from '../pago/guards/pago-merchant-auth.guard';

@Module({
  imports: [TypeOrmModule.forFeature([CredencialComercio])],
  controllers: [ComerciosController],
  providers: [ComerciosService, PagoMerchantAuthGuard],
  exports: [ComerciosService],
})
export class ComerciosModule {}