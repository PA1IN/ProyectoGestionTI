import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PagoService } from './pago.service';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { PagoMerchantAuthGuard } from './guards/pago-merchant-auth.guard';
import { MitDto } from './dto/mit.dto';
import { CheckoutDto } from './dto/checkout.dto';


@Controller('ucnpay')
export class PagoController {
  constructor(private readonly pagoService: PagoService) {}

  @Post('init')
  @UseGuards(PagoMerchantAuthGuard)
  createTransaction(@Req() request: any, @Body() createTransaccionDto: CreateTransaccionDto) {
    return this.pagoService.createTransaction(createTransaccionDto, request.merchantCredential.id);
  }

  @Post('suscription/authorize')
  @UseGuards(PagoMerchantAuthGuard)
  processMit(@Req() request: any, @Body() processMitDto: MitDto) {
    return this.pagoService.processMitPayment(processMitDto, request.merchantCredential.id);
  }

  @Get('checkout/:token')
  getCheckoutTransaccion(@Param('token') token: string) {
    return this.pagoService.getCheckoutTransaccion(token);
  }

  @Get('checkout/:token/qr')
  getCheckoutQr(@Param('token') token: string) {
    return this.pagoService.generateCheckoutQr(token);
  }

  @Get('transaction/:id')
  @UseGuards(PagoMerchantAuthGuard)
  getTransactionInfo(@Req() request: any, @Param('id') id: string) {
    return this.pagoService.getTransactionInfo(id, request.merchantCredential.id);
  }

  @Post('checkout/:token/process')
  async processCheckout(@Param('token') token: string, @Body() checkoutDto: CheckoutDto) {
    return this.pagoService.processTransaction(token, checkoutDto);
  }
  @Post('checkout/:token/process/qr')
  async processCheckoutQr(@Param('token') token: string) {
    return this.pagoService.processQrTransaction(token);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.pagoService.getAllTransacciones(this.parsePagination(page, limit));
  }

  @Get('transacciones')
  getAllTransacciones(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.pagoService.getAllTransacciones(this.parsePagination(page, limit));
  }

  @Get('detalles')
  getAllDetalles(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.pagoService.getAllDetalles(this.parsePagination(page, limit));
  }

  @Get('historiales')
  getAllHistoriales(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.pagoService.getAllHistoriales(this.parsePagination(page, limit));
  }

  @Get('detalle/:id')
  getDetalleTransaccion(@Param('id') id: string) {
    return this.pagoService.getDetalleTransaccion(+id);
  }

  @Get('historial/:id')
  getHistorialTransaccion(@Param('id') id: string) {
    return this.pagoService.getHistorialTransaccion(id);
  }
  @Get('comprobante/:transactionId')
  async getComprobante(@Param('transactionId') transactionId: string) {
    return this.pagoService.getComprobante(transactionId);
  }

  private parsePagination(page?: string, limit?: string) {
    const parsedPage = Number.parseInt(page ?? '1', 10);
    const parsedLimit = Number.parseInt(limit ?? '20', 10);

    return {
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20,
    };
  }
}
