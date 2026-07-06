import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { REQUIRE_ADMIN_KEY } from './admin.decorator';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  private readonly keycloakClientId = 'proyecto-4-frontend';

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers?.authorization as string | undefined;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token de autenticación de Keycloak');
    }

    const token = authorization.slice('Bearer '.length);
    const issuer = this.configService.get<string>('KEYCLOAK_ISSUER') || this.buildIssuer();
    const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
    const requireAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
      });

      request.user = payload;
      if (requireAdmin && !this.hasAdminRole(payload)) {
        throw new ForbiddenException('Se requiere el rol admin');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException('Token de Keycloak inválido o expirado');
    }
  }

  private buildIssuer() {
    const baseUrl = this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost';
    const realm = this.configService.get<string>('KEYCLOAK_REALM') || 'sistema-centralizado';

    return `${baseUrl}/realms/${realm}`;
  }

  private hasAdminRole(payload: Record<string, unknown>): boolean {
    const realmRoles = this.getArrayValue(payload, 'realm_access', 'roles');
    const clientRoles = this.getArrayValue(payload, 'resource_access', this.keycloakClientId, 'roles');

    return realmRoles.includes('admin') || clientRoles.includes('admin');
  }

  private getArrayValue(payload: Record<string, unknown>, ...path: string[]): string[] {
    let current: unknown = payload;

    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return [];
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return Array.isArray(current) ? current.filter((value): value is string => typeof value === 'string') : [];
  }
}