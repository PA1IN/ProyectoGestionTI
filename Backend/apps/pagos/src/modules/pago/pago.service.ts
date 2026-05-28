import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tarjeta } from '../tarjeta/entities/tarjeta.entity';
import { EstadoTarjeta } from '../tarjeta/entities/tarjeta.entity';
import { ProcesarTransaccionDto } from './dto/procesar-transaccion.dto';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { EstadoTransaccionDb, Transaccion } from './entities/transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';

type TransactionPayload = {
  transactionId: string;
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

const mapEstadoApiToDb = (estado: EstadoRespuestaTransaccion): EstadoTransaccionDb => {
  switch (estado) {
    case EstadoRespuestaTransaccion.APROBADO:
      return EstadoTransaccionDb.SUCCESS;
    case EstadoRespuestaTransaccion.PENDIENTE:
      return EstadoTransaccionDb.PENDING;
    case EstadoRespuestaTransaccion.RECHAZADO:
    default:
      return EstadoTransaccionDb.REJECTED;
  }
};

@Injectable()
export class PagoService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Tarjeta)
    private readonly tarjetaService: Repository<Tarjeta>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(HistorialTransaccion)
    private readonly historialRepository: Repository<HistorialTransaccion>,
    @InjectRepository(DetalleTransaccion)
    private readonly detalleRepository: Repository<DetalleTransaccion>,
  ) {}

  async createTransaction(createTransaccionDto: CreateTransaccionDto) {
    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const expiresIn = /^\d+$/.test(expiresInRaw)
      ? Number(expiresInRaw)
      : (expiresInRaw as StringValue);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const transaccion = await this.transaccionRepository.save(
      this.transaccionRepository.create({
        monto: createTransaccionDto.monto.toFixed(2),
        moneda: createTransaccionDto.moneda,
        estado: EstadoTransaccionDb.PENDING,
        idOrden: `ORD-${Date.now()}`,
      }),
    );

    const payload: TransactionPayload = {
      transactionId: transaccion.id,
      monto: createTransaccionDto.monto,
      moneda: createTransaccionDto.moneda,
      nombreComercio: createTransaccionDto.nombreComercio,
      returnUrl: createTransaccionDto.returnUrl,
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn });
    const transactionUrl = `${frontendUrl}/checkout/${encodeURIComponent(token)}`;

    return {
      token,
      transactionUrl,
      transactionId: transaccion.id,
      tokenType: 'Bearer',
      expiresIn: expiresInRaw,
    };
  }

  async processTransaction(token: string, procesarTransaccionDto: ProcesarTransaccionDto): Promise<ProcessTransactionResult> {
    try {
      const payload = await this.jwtService.verifyAsync<TransactionPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const transaccion = await this.transaccionRepository.findOne({ where: { id: payload.transactionId } });
      if (!transaccion) {
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Transacción no encontrada',
          transactionId: payload.transactionId,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${payload.transactionId}`,
        };
      }

      const card = await this.tarjetaService.findOne({ where: { numero: procesarTransaccionDto.numeroTarjeta } });
      const cardIsValid = Boolean(card && card.cvv === procesarTransaccionDto.cvv && card.fechaExpiracion === procesarTransaccionDto.fechaExpiracion);
      const status = cardIsValid && card ? mapEstadoTarjetaToRespuesta(card.estado) : EstadoRespuestaTransaccion.RECHAZADO;
      const previousStatus = transaccion.estado;

      await this.detalleRepository.save(
        this.detalleRepository.create({
          transaccion,
          nombreUsuario: procesarTransaccionDto.titular,
          rut: procesarTransaccionDto.rut ?? '',
          tipoPago: TipoPagoDb.TARJETA,
          ultimosCuatro: procesarTransaccionDto.numeroTarjeta.slice(-4),
          cuotas: status === EstadoRespuestaTransaccion.APROBADO ? 1 : 0,
          ...(status === EstadoRespuestaTransaccion.APROBADO
            ? { codigoAutorizacion: `auth_${Math.random().toString(36).slice(2, 8)}` }
            : {}),
          emisorTarjeta: card ? 'TARJETA_SIMULADA' : 'TARJETA_NO_ENCONTRADA',
        }),
      );

      transaccion.estado = mapEstadoApiToDb(status);
      transaccion.rrn = Math.floor(100000 + Math.random() * 900000);
      await this.transaccionRepository.save(transaccion);

      await this.historialRepository.save(
        this.historialRepository.create({
          transaccion,
          statusFrom: previousStatus,
          statusTo: mapEstadoApiToDb(status),
        }),
      );

      const isApproved = status === EstadoRespuestaTransaccion.APROBADO;
      const transactionId = transaccion.id;

      return {
        status,
        message: !card
          ? 'Tarjeta no encontrada'
          : !cardIsValid
            ? 'Datos de tarjeta inválidos'
            : isApproved
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
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Token inválido o expirado',
          transactionId: 'unknown',
          redirectUrl: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}?status=RECHAZADO&transactionId=unknown`,
        };
      }
  }
  async getDetalleTransaccion(id: number) {
    const detalle = await this.detalleRepository.findOne({
      where: { id },
      relations: ['transaccion'],
    });
    if (!detalle) {
      return null;
    }
    return {
      id: detalle.id,
      nombreUsuario: detalle.nombreUsuario,
      rut: detalle.rut,
      tipoPago: detalle.tipoPago,
      ultimosCuatro: detalle.ultimosCuatro,
      cuotas: detalle.cuotas,
      codigoAutorizacion: detalle.codigoAutorizacion,
      emisorTarjeta: detalle.emisorTarjeta,
    };
  }
  async getHistorialTransaccion(id: string) {
    const historial = await this.historialRepository.find({
      where: { transaccion: { id } },
      relations: ['transaccion'],
    });
    if (!historial || historial.length === 0) {
      return null;
    }
    return historial.map((entry) => ({
      id: entry.id,
      statusFrom: entry.statusFrom,
      statusTo: entry.statusTo,
      createdAt: entry.createdAt,
    }));
  }
  async getAllTransacciones() {
    const transacciones = await this.transaccionRepository.find({ relations: ['detalles', 'historial'] });
    return transacciones;
  }
  async getAllDetalles() {
    const detalles = await this.detalleRepository.find({ relations: ['transaccion'] });
    return detalles;
  }
  async getAllHistoriales() {
    const historiales = await this.historialRepository.find({ relations: ['transaccion'] });
    return historiales;
  }
  

  findAll() {
    return `This action returns all pago`;
  }

  findOne(id: number) {
    return `This action returns a #${id} pago`;
  }
}
