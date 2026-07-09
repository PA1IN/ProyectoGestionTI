import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TarjetaService } from './tarjeta.service';
import { CreateTarjetaDto } from './dto/create-tarjeta.dto';
import { AutorizarTarjetaBancoDto } from './dto/autorizar-tarjeta-banco.dto';
import { PagoMerchantAuthGuard } from '../pago/guards/pago-merchant-auth.guard';


@Controller('tarjeta')
@UseGuards(PagoMerchantAuthGuard)
export class TarjetaController {
  constructor(private readonly tarjetaService: TarjetaService) {}

  @Post()
  create(@Body() createTarjetaDto: CreateTarjetaDto) {
    return this.tarjetaService.create(createTarjetaDto);
  }

  @Post('banco/autorizar')
  autorizarBanco(@Body() autorizarTarjetaBancoDto: AutorizarTarjetaBancoDto) {
    return this.tarjetaService.autorizarBanco(autorizarTarjetaBancoDto);
  }

  @Get()
  findAll() {
    return this.tarjetaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tarjetaService.findOne(+id);
  }

  
}
