import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ComerciosService } from '../../comercios/comercios.service';

@Injectable()
export class PagoMerchantAuthGuard implements CanActivate {
  constructor(private readonly comerciosService: ComerciosService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const publicKey = this.getHeaderValue(request.headers['x-public-key']);
    const privateKey = this.getHeaderValue(request.headers['x-private-key']);

    if (!privateKey) {
      throw new UnauthorizedException('Faltan credenciales del comercio');
    }

    const credential = await this.comerciosService.validarCredenciales(privateKey);
    if (!credential) {
      throw new UnauthorizedException('Credenciales del comercio inválidas');
    }

    request.merchantCredential = credential;
    return true;
  }

  private getHeaderValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}