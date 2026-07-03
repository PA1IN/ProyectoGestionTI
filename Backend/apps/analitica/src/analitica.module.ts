import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@libs/config';
import { RmqModule } from '@app/rmq';
import { AnaliticaController } from './analitica.controller';
import { AnaliticaService } from './analitica.service';
import { AlertaHistorica } from './entities/alerta-historica.entity';

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
  providers: [AnaliticaService],
})
export class AnaliticaModule {}
