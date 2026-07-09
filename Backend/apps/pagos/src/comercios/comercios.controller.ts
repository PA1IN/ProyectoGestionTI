import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ComerciosService } from './comercios.service';
import { CreateComercioDto } from './dto/create-comercio.dto';
import { PagoMerchantAuthGuard } from '../pago/guards/pago-merchant-auth.guard';

@Controller('comercios')
@UseGuards(PagoMerchantAuthGuard)
export class ComerciosController {
  constructor(private readonly comerciosService: ComerciosService) {}

  @Post()
  create(@Body() createComercioDto: CreateComercioDto) {
    return this.comerciosService.create(createComercioDto);
  }

  @Get()
  findAll() {
    return this.comerciosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comerciosService.buscarPorId(id);
  }
}