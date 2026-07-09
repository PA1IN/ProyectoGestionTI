import { Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaccion } from './entities/transaccion.entity';
import { DetalleTransaccion } from './entities/detalle-transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ConfigModule } from '@libs/config';
import type { StringValue } from 'ms';
import { MediosPagoModule } from '../medios-pago/medios-pago.module';
import { ComerciosModule } from '../comercios/comercios.module';
import { TarjetaModule } from '../tarjeta/tarjeta.module';
import { TarjetaGuardada } from '../medios-pago/entities/tarjeta-guardada.entity';
import { MandatoPago } from '../medios-pago/entities/mandato-pago.entity';
import { CredencialComercio } from '../comercios/entities/credencial-comercio.entity';
import { PagoMerchantAuthGuard } from './guards/pago-merchant-auth.guard';
import { RmqModule } from '@app/rmq';

@Module({
  imports: [
    ConfigModule,
    MediosPagoModule,
    ComerciosModule,
    TarjetaModule,
    RmqModule,
    NestConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        synchronize: process.env.NODE_ENV !== 'production',
        autoLoadEntities: true,
      }),
    }),
    JwtModule.registerAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInRaw = configService.get<string>('JWT_EXPIRES_IN');
        const expiresIn = /^\d+$/.test(expiresInRaw!)
          ? Number(expiresInRaw)
          : (expiresInRaw as StringValue);

        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([TarjetaGuardada, MandatoPago, CredencialComercio, Transaccion, DetalleTransaccion, HistorialTransaccion]),
  ],
  controllers: [PagoController],
  providers: [PagoService, PagoMerchantAuthGuard],
})
export class PagoModule {}
