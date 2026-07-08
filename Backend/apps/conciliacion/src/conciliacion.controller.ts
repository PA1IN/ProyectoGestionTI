import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ConciliacionService } from './conciliacion.service';

const USUARIO_SISTEMA_UUID = '00000000-0000-0000-0000-000000000000';

interface PatchDiscrepanciaBody {
  resuelto_por?: string;
}

@Controller('conciliacion/discrepancias')
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  @Get(':rrn')
  async getDiscrepancyByRrn(@Param('rrn', ParseIntPipe) rrn: number) {
    const discrepancia = await this.conciliacionService.getDiscrepancyByRrn(rrn);

    if (!discrepancia) {
      throw new NotFoundException(`No existe una discrepancia para el RRN ${rrn}`);
    }

    return discrepancia;
  }

  @Patch(':rrn')
  async closeDiscrepancyByRrn(
    @Param('rrn', ParseIntPipe) rrn: number,
    @Body() body: PatchDiscrepanciaBody,
  ) {
    const discrepancia = await this.conciliacionService.closeDiscrepancyByRrn(
      rrn,
      body.resuelto_por ?? USUARIO_SISTEMA_UUID,
    );

    if (!discrepancia) {
      throw new NotFoundException(`No existe una discrepancia para el RRN ${rrn}`);
    }

    return discrepancia;
  }

  @Get('discrepancias')
  async getAllDiscrepancies() {
    return this.conciliacionService.getAllDiscrepancies();
  }
}