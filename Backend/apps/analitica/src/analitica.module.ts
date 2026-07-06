import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@libs/config';
import { RmqModule } from '@app/rmq';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';
import { AlertaHistorica } from './entities/alerta-historica.entity';
import { KeycloakAuthGuard } from './auth/keycloak-auth.guard';

@Module({
  imports: [
    ConfigModule,
    RmqModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: process.env.NODE_ENV !== 'production',
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([AlertaHistorica]),
  ],
  controllers: [AnaliticaController],
  providers: [
    AnaliticaService,
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
  ],
})
export class AnaliticaModule {}
