import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IncomingHttpHeaders } from 'http';

export interface ProxyResponse<T = unknown> {
  status: number;
  body: T;
}

@Injectable()
export class GatewayService {
  constructor(private readonly configService: ConfigService) {}

  get pagosBaseUrl() {
    return this.configService.get<string>('PAGOS_SERVICE_URL') || 'http://localhost:3001';
  }

  get conciliacionBaseUrl() {
    return this.configService.get<string>('CONCILIACION_SERVICE_URL') || 'http://localhost:3002';
  }

  get analiticaBaseUrl() {
    return this.configService.get<string>('ANALITICA_SERVICE_URL') || 'http://localhost:3003';
  }

  async forwardJsonRequest<T>(
    baseUrl: string,
    path: string,
    method: string,
    body?: unknown,
    headers?: IncomingHttpHeaders,
    extraHeaders?: Record<string, string>,
    forwardAuthorization = true,
  ): Promise<ProxyResponse<T>> {
    try {
      const response = await fetch(new URL(path, baseUrl), {
        method,
        headers: this.buildHeaders(
          headers,
          body === undefined ? extraHeaders : { ...(extraHeaders ?? {}), 'Content-Type': 'application/json' },
          forwardAuthorization,
        ),
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      return this.readResponse<T>(response);
    } catch {
      throw new ServiceUnavailableException(`No se pudo conectar con ${baseUrl}`);
    }
  }

  async forwardMultipartRequest<T>(
    baseUrl: string,
    path: string,
    file: Express.Multer.File,
    fields: Record<string, string | undefined>,
    headers?: IncomingHttpHeaders,
    forwardAuthorization = true,
  ): Promise<ProxyResponse<T>> {
    const formData = new FormData();
    formData.append('archivo', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });

    try {
      const response = await fetch(new URL(path, baseUrl), {
        method: 'POST',
        headers: this.buildHeaders(headers, undefined, forwardAuthorization),
        body: formData,
      });

      return this.readResponse<T>(response);
    } catch {
      throw new ServiceUnavailableException(`No se pudo conectar con ${baseUrl}`);
    }
  }

  private buildHeaders(
    headers?: IncomingHttpHeaders,
    extraHeaders?: Record<string, string>,
    forwardAuthorization = true,
  ): Record<string, string> {
    const forwardedHeaders: Record<string, string> = { ...(extraHeaders ?? {}) };
    const authorization = forwardAuthorization ? this.getHeaderValue(headers, 'authorization') : undefined;
    const transactionToken = this.getHeaderValue(headers, 'x-transaction-token');
    const publicKey = this.getHeaderValue(headers, 'x-public-key');
    const privateKey = this.getHeaderValue(headers, 'x-private-key');
    const cookie = this.getHeaderValue(headers, 'cookie');

    if (authorization) {
      forwardedHeaders.authorization = authorization;
    }

    if (transactionToken) {
      forwardedHeaders['x-transaction-token'] = transactionToken;
    }

    if (publicKey) {
      forwardedHeaders['x-public-key'] = publicKey;
    }

    if (privateKey) {
      forwardedHeaders['x-private-key'] = privateKey;
    }

    if (cookie) {
      forwardedHeaders.cookie = cookie;
    }

    return forwardedHeaders;
  }

  private getHeaderValue(headers: IncomingHttpHeaders | undefined, key: string): string | undefined {
    const value = headers?.[key];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  private async readResponse<T>(response: Response): Promise<ProxyResponse<T>> {
    const contentType = response.headers.get('content-type') ?? '';
    const status = response.status;

    if (contentType.includes('application/json')) {
      try {
        return {
          status,
          body: (await response.json()) as T,
        };
      } catch {
        return {
          status,
          body: (await response.text()) as T,
        };
      }
    }

    return {
      status,
      body: (await response.text()) as T,
    };
  }
}