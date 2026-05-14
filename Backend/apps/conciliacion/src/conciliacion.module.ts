import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ConfigModule } from '@libs/config';
import { ConciliacionTemporal } from './conciliacion.entity';
import { ProcesamientoModule } from './procesamiento/procesamiento.module';

@Module({
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
    TypeOrmModule.forFeature([
      ConciliacionTemporal
    ]),
    MulterModule.register({
      storage: memoryStorage(),
    }),
    ProcesamientoModule,
  ],
  exports: [ProcesamientoModule],
})
export class ConciliacionModule {}
