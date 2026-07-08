import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { IncomingHttpHeaders } from 'http';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { AdminOnly } from './auth/admin.decorator';
import { Public } from './auth/public.decorator';
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

@Controller('api')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  @Public()
  getHealth() {
    return {
      status: 'ok',
      servicios: ['pagos', 'conciliacion'],
    };
  }

  @Get('auth/me')
  async me(@Req() request: any, @Res({ passthrough: true }) response: Response) {
    const roles = this.extractRoles(request.user);

    response.status(HttpStatus.OK);

    return {
      authenticated: true,
      sub: request.user?.sub ?? null,
      username: request.user?.preferred_username ?? request.user?.username ?? null,
      email: request.user?.email ?? null,
      name: request.user?.name ?? null,
      roles,
      isAdmin: roles.includes('admin'),
      tokenType: 'Bearer',
    };
  }

  @Post('comercios')
  @AdminOnly()
  async createComercio(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/comercios',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Post('tarjeta')
  @Public()
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
  @Public()
  async getTarjetas(@Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: Response) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(this.gatewayService.pagosBaseUrl, '/tarjeta', 'GET', undefined, headers),
    );
  }

  @Get('tarjeta/:id')
  @Public()
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

  @Post('ucnpay/init')
  @Public()
  async createTransaccion(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/ucnpay/init',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Get('ucnpay/checkout/:token')
  @Public()
  async getCheckoutTransaccion(
    @Param('token') token: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/ucnpay/checkout/${token}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Post('ucnpay/checkout/:token/process')
  @Public()
  async processTransaction(
    @Param('token') token: string,
    @Body() body: ProcessTransaccionBody,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Se requiere el token de checkout');
    }

    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/ucnpay/checkout/${token}/process`,
        'POST',
        body,
        headers,
      ),
    );
  }
  @Get('ucnpay/checkout/:token/qr')
  @Public()
  async getCheckoutQr(
    @Param('token') token: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/ucnpay/checkout/${token}/qr`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Post('ucnpay/checkout/:token/process/qr')
  @Public()
  async processCheckoutQr(
    @Param('token') token: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!token) {
      throw new BadRequestException('Se requiere el token de checkout');
    }

    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        `/ucnpay/checkout/${token}/process/qr`,
        'POST',
        undefined, 
        headers,
      ),
    );
  }

  @Get('conciliacion/discrepancias')
  @AdminOnly() 
  async getAllDiscrepancies(
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.conciliacionBaseUrl,
        '/conciliacion/discrepancias',
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Post('ucnpay/init/suscription')
  @Public()
  async tokenizeMit(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/ucnpay/init/suscription',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Get('analitica/alertas')
  @AdminOnly()
  async getAlertasHistoricas(
    @Query('revisado') revisado: string | undefined,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    const query = revisado !== undefined ? `?revisado=${encodeURIComponent(revisado)}` : '';

    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.analiticaBaseUrl,
        `/analitica/alertas${query}`,
        'GET',
        undefined,
        headers,
      ),
    );
  }

  @Patch('analitica/alertas/:id/revisar')
  @AdminOnly()
  async marcarAlertaComoRevisada(
    @Param('id') id: string,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.analiticaBaseUrl,
        `/analitica/alertas/${id}/revisar`,
        'PATCH',
        undefined,
        headers,
      ),
    );
  }

  @Post('ucnpay/suscription/authorize')
  @Public()
  async authorizeSuscription(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/ucnpay/suscription/authorize',
        'POST',
        body,
        headers,
      ),
    );
  }

  @Delete('ucnpay/tarjeta')
  @Public()
  async eliminarTarjeta(
    @Body() body: Record<string, unknown>,
    @Headers() headers: IncomingHttpHeaders,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.relay(
      response,
      this.gatewayService.forwardJsonRequest(
        this.gatewayService.pagosBaseUrl,
        '/ucnpay/tarjeta',
        'DELETE',
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
  @AdminOnly()
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
  @AdminOnly()
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

  private extractRoles(user: any): string[] {
    const realmRoles = Array.isArray(user?.realm_access?.roles) ? user.realm_access.roles : [];
    const resourceAccess = user?.resource_access ?? {};
    const clientRoles = Object.values(resourceAccess).flatMap((access: any) =>
      Array.isArray(access?.roles) ? access.roles : [],
    );

    return [...new Set([...realmRoles, ...clientRoles].filter((role): role is string => typeof role === 'string'))];
  }
}