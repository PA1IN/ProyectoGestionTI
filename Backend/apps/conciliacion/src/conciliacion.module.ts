import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule } from '@libs/config';
import { RmqModule } from '@app/rmq';
import { ConciliacionController } from './conciliacion.controller';
import { ConciliacionTemporal } from './conciliacion.entity';
import { ProcesamientoModule } from './procesamiento/procesamiento.module';

@Module({
  controllers: [ConciliacionController],
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        synchronize: process.env.NODE_ENV !== 'production',
        autoLoadEntities: true,
      }),
    }),
    TypeOrmModule.forFeature([ConciliacionTemporal]),
    RmqModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
    ProcesamientoModule,
  ],
  exports: [ProcesamientoModule],
})
export class ConciliacionModule {}
