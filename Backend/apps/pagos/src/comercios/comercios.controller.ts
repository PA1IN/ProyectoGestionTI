import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ComerciosService } from './comercios.service';
import { CreateComercioDto } from './dto/create-comercio.dto';

@Controller('comercios')
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