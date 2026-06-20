import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PagoService } from './pago.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { ProcesarTransaccionDto } from './dto/procesar-transaccion.dto';

@Controller('pago')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @Post('transaccion')
  createTransaction(@Body() createTransaccionDto: CreateTransaccionDto) {
    return this.pagoService.createTransaction(createTransaccionDto);
  }

  @Get('checkout/:token')
  getCheckoutTransaccion(@Param('token') token: string) {
    return this.pagoService.getCheckoutTransaccion(token);
  }

  @Post('process')
  processTransaction(
    @Headers('authorization') authorization: string,
    @Body() processTransactionDto: ProcesarTransaccionDto,
  ) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : authorization;

    return this.pagoService.processTransaction(token, processTransactionDto);
  }

  @Get()
  findAll() {
    return this.pagoService.getAllTransacciones();
  }

  @Get('transacciones')
  getAllTransacciones() {
    return this.pagoService.getAllTransacciones();
  }

  @Get('detalles')
  getAllDetalles() {
    return this.pagoService.getAllDetalles();
  }

  @Get('historiales')
  getAllHistoriales() {
    return this.pagoService.getAllHistoriales();
  }

  @Get('detalle/:id')
  getDetalleTransaccion(@Param('id') id: string) {
    return this.pagoService.getDetalleTransaccion(+id);
  }

  @Get('historial/:id')
  getHistorialTransaccion(@Param('id') id: string) {
    return this.pagoService.getHistorialTransaccion(id);
  }
}
