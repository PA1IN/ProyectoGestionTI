import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IncomingHttpHeaders } from 'http';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { GatewayService } from './gateway.service';

interface ProcessTransaccionBody {
  [key: string]: unknown;
}

interface UploadConciliacionBody {
  fecha_hora?: string;
  archivo_id?: string;
}

interface PatchDiscrepanciaBody {
  resuelto_por?: string;
  estado?: string;
}

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      servicios: ['pagos', 'conciliacion'],
    };
  }

  @Post('auth/login')
  async login(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/auth/login',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Get('auth/profile')
  async profile(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/auth/profile', 'GET', undefined, headers),
    );
  }

  @Post('tarjeta')
  async createTarjeta(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/tarjeta', 'POST', body, headers),
    );
  }

  @Get('tarjeta')
  async getTarjetas(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/tarjeta', 'GET', undefined, headers),
    );
  }

  @Get('tarjeta/:id')
  async getTarjetaById(
    @Param('id') id: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/tarjeta/${id}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Post('pago/transaccion')
  async createTransaccion(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/pago/transaccion',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Get('pago')
  async getPagos(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/pago', 'GET', undefined, headers),
    );
  }

  @Get('pago/transacciones')
  async getTransacciones(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/pago/transacciones',
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Get('pago/detalles')
  async getDetalles(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/pago/detalles', 'GET', undefined, headers),
    );
  }

  @Get('pago/historiales')
  async getHistoriales(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/pago/historiales',
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Get('pago/detalle/:id')
  async getDetalleTransaccion(
    @Param('id') id: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/pago/detalle/${id}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Get('pago/historial/:id')
  async getHistorialTransaccion(
    @Param('id') id: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/pago/historial/${id}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Get('pago/checkout/:token')
  async getCheckoutTransaccion(
    @Param('token') token: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/pago/checkout/${token}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Post('pago/process')
  async processTransaction(
    @Body() body: ProcessTransaccionBody,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/pago/process',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Post('conciliacion/procesamiento/upload')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/i)) {
          return cb(new BadRequestException('Solo se aceptan archivos .csv'), false);
        }

        cb(null, true);
      },
    }),
  )
  async uploadConciliacion(
    @UploadedFile() archivo: Express.Multer.File,
    @Body() body: UploadConciliacionBody,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!archivo) {
      throw new BadRequestException('Se requiere el campo "archivo"');
    }

    return this.relay(
      response,
      this.gatewayService.forwardMultipartRequest(
        this.gatewayService.conciliacionBaseUrl,
        '/conciliacion/procesamiento/upload',
        archivo,
        {
          fecha_hora: body.fecha_hora,
          archivo_id: body.archivo_id,
        },
        headers,
      ),
    );
  }

  @Get('conciliacion/discrepancias/:rrn')
  async getDiscrepancyByRrn(
    @Param('rrn', ParseIntPipe) rrn: number,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.conciliacionBaseUrl,
        `/conciliacion/discrepancias/${rrn}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Patch('conciliacion/discrepancias/:rrn')
  async closeDiscrepancyByRrn(
    @Param('rrn', ParseIntPipe) rrn: number,
    @Body() body: PatchDiscrepanciaBody,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.conciliacionBaseUrl,
        `/conciliacion/discrepancias/${rrn}`,
        'PATCH',
        body,
        headers,
      ),
    );
  }

  private async relay<T>(response: Response, upstream: Promise<{ status: number; body: T }>) {
    const proxiedResponse = await upstream;
    response.status(proxiedResponse.status);

    if (proxiedResponse.status === HttpStatus.NO_CONTENT) {
      return null;
    }

    return proxiedResponse.body;
  }
}