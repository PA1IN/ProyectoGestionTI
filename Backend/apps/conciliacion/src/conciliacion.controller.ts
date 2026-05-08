import { Controller, Get } from '@nestjs/common';
import { ConciliacionService } from './conciliacion.service';

@Controller()
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  @Get()
  getHello(): string {
    return this.conciliacionService.getHello();
  }
}
