import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
