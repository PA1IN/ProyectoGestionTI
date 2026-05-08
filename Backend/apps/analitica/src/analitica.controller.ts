import { Controller, Get } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';

@Controller()
export class AnaliticaController {
  constructor(private readonly analiticaService: AnaliticaService) {}

  @Get()
  getHello(): string {
    return this.analiticaService.getHello();
  }
}
