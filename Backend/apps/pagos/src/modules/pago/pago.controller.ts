import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PagoService } from './pago.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';

@Controller('pago')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @Post('transaccion')
  createTransaction(@Body() createPagoDto: CreatePagoDto) {
    return this.pagoService.createTransaction(createPagoDto);
  }

  @Post('process')
  processTransaction(
    @Headers('authorization') authorization: string,
    @Body() processTransactionDto: ProcesarPagoDto,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : authorization;

    return this.pagoService.processTransaction(token, processTransactionDto);
  }

  @Get()
  findAll() {
    return this.pagoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagoService.findOne(+id);
  }
}
