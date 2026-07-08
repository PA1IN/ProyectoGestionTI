import { Body, BadRequestException, Controller, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get()
  async getAllDiscrepancies() {
    return this.conciliacionService.getAllDiscrepancies();
  }

@Post('exportar-csv')
  async exportarCsv(
    @Body() body: { simulation: string | boolean; prob?: number },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (body?.simulation === undefined || body?.simulation === null) {
      throw new BadRequestException('El campo "simulation" es obligatorio');
    }

    const { csv, filasFalladas } = await this.conciliacionService.exportarTransaccionesCsv(
      body.simulation,
      body.prob,
    );

    res.setHeader('X-Filas-Afectadas', String(filasFalladas));

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="conciliacion_temporal.csv"');

    return `\ufeff${csv}`;
  }
}