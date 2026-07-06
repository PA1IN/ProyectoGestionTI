import { BadRequestException, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AnaliticaService } from './analitica.service';
import { AdminOnly } from './auth/admin.decorator';

@AdminOnly()
@Controller('analitica')
export class AnaliticaController {
  constructor(private readonly analiticaService: AnaliticaService) {}

  @Get('alertas')
  getAlertasHistoricas(@Query('revisado') revisado?: string) {
    return this.analiticaService.obtenerAlertasHistoricas(this.parseRevisado(revisado));
  }

  @Patch('alertas/:id/revisar')
  revisarAlerta(@Param('id') id: string) {
    return this.analiticaService.marcarAlertaComoRevisada(id);
  }

  private parseRevisado(revisado?: string): boolean | undefined {
    if (revisado === undefined) {
      return undefined;
    }

    if (revisado === 'true') {
      return true;
    }

    if (revisado === 'false') {
      return false;
    }

    throw new BadRequestException('El filtro revisado debe ser true o false');
  }
}
