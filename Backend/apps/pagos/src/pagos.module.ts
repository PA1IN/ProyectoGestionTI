import { Module } from '@nestjs/common';
import { ConfigModule } from '@libs/config';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [ConfigModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
