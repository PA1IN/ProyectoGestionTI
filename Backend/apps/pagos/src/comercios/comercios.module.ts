import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComerciosController } from './comercios.controller';
import { ComerciosService } from './comercios.service';
import { CredencialComercio } from './entities/credencial-comercio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CredencialComercio])],
  controllers: [ComerciosController],
  providers: [ComerciosService],
  exports: [ComerciosService],
})
export class ComerciosModule {}