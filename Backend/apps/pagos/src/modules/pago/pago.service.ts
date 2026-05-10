import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { CreatePagoDto } from './dto/create-pago.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { EstadoTarjeta } from '../tarjeta/entities/tarjeta.entity';
import { ProcesarPagoDto } from './dto/procesar-pago.dto';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';

type TransactionPayload = {
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  tipo: 'transaccion-init';
  iatAt: string;
};

type ProcessTransactionResult = {
  status: EstadoRespuestaTransaccion;
  message: string;
  redirectUrl: string;
  transactionId: string;
  details?: {
    monto: number;
    moneda: string;
    nombreComercio: string;
  };
};

const mapEstadoTarjetaToRespuesta = (estado: EstadoTarjeta): EstadoRespuestaTransaccion => {
  switch (estado) {
    case EstadoTarjeta.APROBADO:
      return EstadoRespuestaTransaccion.APROBADO;
    case EstadoTarjeta.PENDIENTE:
      return EstadoRespuestaTransaccion.PENDIENTE;
    case EstadoTarjeta.RECHAZADO:
    default:
      return EstadoRespuestaTransaccion.RECHAZADO;
  }
};

@Injectable()
export class PagoService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Tarjeta)
    private readonly tarjetaService: Repository<Tarjeta>,
  ) {}

  async createTransaction(createPagoDto: CreatePagoDto) {
    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const expiresIn = /^\d+$/.test(expiresInRaw)
      ? Number(expiresInRaw)
      : (expiresInRaw as StringValue);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const payload: TransactionPayload = {
      monto: createPagoDto.monto,
      moneda: createPagoDto.moneda,
      nombreComercio: createPagoDto.nombreComercio,
      returnUrl: createPagoDto.returnUrl,
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn });
    const transactionUrl = `${frontendUrl}/checkout/${encodeURIComponent(token)}`;

    return {
      token,
      transactionUrl,
      tokenType: 'Bearer',
      expiresIn: expiresInRaw,
    };
  }

  async processTransaction(token: string, procesarPagoDto: ProcesarPagoDto): Promise<ProcessTransactionResult> {
    try {
      const payload = await this.jwtService.verifyAsync<TransactionPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const card = await this.tarjetaService.findOne({ where: { numero: procesarPagoDto.numeroTarjeta } });
      if (!card) {
        const transactionId = `txn_${Math.random().toString(36).slice(2, 11)}`;
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Tarjeta no encontrada',
          transactionId,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${transactionId}`,
        };
      }

      if (card.cvv !== procesarPagoDto.cvv || card.fechaExpiracion !== procesarPagoDto.fechaExpiracion) {
        const transactionId = `txn_${Math.random().toString(36).slice(2, 11)}`;
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Datos de tarjeta inválidos',
          transactionId,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${transactionId}`,
        };
      }
      const status = mapEstadoTarjetaToRespuesta(card.estado);
      const isApproved = status === EstadoRespuestaTransaccion.APROBADO;
      const transactionId = `txn_${Math.random().toString(36).slice(2, 11)}`;

      return {
        status,
        message: isApproved
          ? 'Transacción aprobada'
          : status === EstadoRespuestaTransaccion.PENDIENTE
            ? 'Transacción pendiente de confirmación'
            : 'Transacción rechazada',
        redirectUrl: `${payload.returnUrl}?status=${status}&transactionId=${transactionId}`,
        transactionId,
        details: {
          monto: payload.monto,
          moneda: payload.moneda,
          nombreComercio: payload.nombreComercio,
        },
      };
    }
      catch (error) {
        const transactionId = `txn_${Math.random().toString(36).slice(2, 11)}`;
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Token inválido o expirado',
          transactionId,
          redirectUrl: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}?status=RECHAZADO&transactionId=${transactionId}`,
        };
      }
  }

  findAll() {
    return `This action returns all pago`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pago`;
  }
}
