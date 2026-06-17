import { Module } from '@nestjs/common';
import { PagoService } from './pago.service';
import { PagoController } from './pago.controller';
import { TarjetaModule } from '../tarjeta/tarjeta.module';
import { Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaccion } from './entities/transaccion.entity';
import { DetalleTransaccion } from './entities/detalle-transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

@Module({
  imports: [
    TarjetaModule,
    NestConfigModule,
    JwtModule.registerAsync({
      imports: [NestConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInRaw = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        const expiresIn = /^\d+$/.test(expiresInRaw)
          ? Number(expiresInRaw)
          : (expiresInRaw as StringValue);

        return {
          secret: configService.get<string>('JWT_SECRET') || 'R4nd0mS3cr3tK3yF0rJWT',
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
    TypeOrmModule.forFeature([Tarjeta, Transaccion, DetalleTransaccion, HistorialTransaccion]),
  ],
  controllers: [PagoController],
  providers: [PagoService],
})
export class PagoModule {}
