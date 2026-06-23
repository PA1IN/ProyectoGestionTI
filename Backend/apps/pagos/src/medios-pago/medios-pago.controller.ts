import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { MediosPagoService } from './medios-pago.service';
import { TokenizarMitDto } from './dto/token-mit.dto';
import { DeleteTarjetaGuardadaDto } from './dto/delete-tarjeta-guardada.dto';
import { PagoMerchantAuthGuard } from '../pago/guards/pago-merchant-auth.guard';

@Controller('ucnpay')
export class MediosPagoController {
  constructor(private readonly mediosPagoService: MediosPagoService) {}

  @Post('init/suscription')
  @UseGuards(PagoMerchantAuthGuard)
  tokenizeMit(@Req() request: any, @Body() tokenizeMitDto: TokenizarMitDto) {
    return this.mediosPagoService.tokenizeMitCard(tokenizeMitDto, request.merchantCredential.id);
  }

  @Delete('tarjeta')
  eliminarTarjeta(@Body() deleteTarjetaDto: DeleteTarjetaGuardadaDto) {
    return this.mediosPagoService.eliminarTarjetaGuardada(deleteTarjetaDto.userId, deleteTarjetaDto.token);
  }
}
