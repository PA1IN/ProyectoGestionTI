import { Controller, Get } from '@nestjs/common';
import { PagosService } from './pagos.service';

@Controller()
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Get()
  getHello(): string {
    return this.pagosService.getHello();
  }
}
