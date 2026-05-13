import { Module } from '@nestjs/common';
import { ConfigModule } from '@libs/config';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { AuthModule } from './auth/auth.module';
import { PagoModule } from './modules/pago/pago.module';
import { Tarjeta } from './modules/tarjeta/entities/tarjeta.entity';
import { Pago } from './modules/pago/entities/pago.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        entities: [Tarjeta, Pago],
        synchronize: configService.get<boolean>('database.synchronize') ?? true,
      }),
    }),
    AuthModule,
    PagoModule,
  ],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
