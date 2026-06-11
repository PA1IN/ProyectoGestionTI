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
import { RabbitMqPublisherService } from './rabbitmq/rabbitmq-publisher.service';

type TransactionPayload = { //mapeando el payload del token
  transactionId: string;
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  tipo: 'transaccion-init';
  iatAt: string;
};

type ProcessTransactionResult = { //maopeando respuesta de transaccion
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
  switch (estado) { //Map para mayor fluidez en las respuestas
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
  switch (estado) { //Map para mayor fluidez en las respuestas
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
    private readonly rabbitMqPublisherService: RabbitMqPublisherService,
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
    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN') || '15m'; //se crea el token con un tiempo definido
    const expiresIn = /^\d+$/.test(expiresInRaw) 
      ? Number(expiresInRaw)
      : (expiresInRaw as StringValue);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'; // se obtiene la url del env o se usa la default

    const transaccion = await this.transaccionRepository.save(//se guarda la transaccion en la base de datos
      this.transaccionRepository.create({ 
        monto: createTransaccionDto.monto.toFixed(2), //se guarda el monto utilizando solo 2 decimales
        moneda: createTransaccionDto.moneda,
        estado: EstadoTransaccionDb.PENDING,
        idOrden: `ORD-${Date.now()}`, // se genera la id utilizando la fecha
      }),
    );

    const payload: TransactionPayload = { // se usa la interfaz antes creada para generar el token de respuesta
      transactionId: transaccion.id,  //se rellena el payload con el dto
      monto: createTransaccionDto.monto,
      moneda: createTransaccionDto.moneda,
      nombreComercio: createTransaccionDto.nombreComercio,
      returnUrl: createTransaccionDto.returnUrl,
      tipo: 'transaccion-init',
      iatAt: new Date().toISOString(),
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn });
    const transactionUrl = `${frontendUrl}/checkout/${encodeURIComponent(token)}`;

    return { //se devuelve el token y se adjunta la url para rederigir el front al final de la transaccion
      token,
      transactionUrl,
      transactionId: transaccion.id,
      tokenType: 'Bearer',
      expiresIn: expiresInRaw,
    };
  }

  async processTransaction(token: string, procesarTransaccionDto: ProcesarTransaccionDto): Promise<ProcessTransactionResult> {
    let payload: TransactionPayload | undefined;

    try {
      payload = await this.jwtService.verifyAsync<TransactionPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'), //se desencripta el token para ver la payload
      });

      const transaccion = await this.transaccionRepository.findOne({ where: { id: payload.transactionId } });
      if (!transaccion) { //se busca la transaccion si no se encuentra se rechaza la transaccion y envia un mensaje de error
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Transacción no encontrada',
          transactionId: payload.transactionId,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${payload.transactionId}`,
        };
      }
      //se comprueba la tarjeta, si se encuentra y los datos son validos
      const card = await this.tarjetaService.findOne({ where: { numero: procesarTransaccionDto.numeroTarjeta } });
      const cardIsValid = Boolean(card && card.cvv === procesarTransaccionDto.cvv && card.fechaExpiracion === procesarTransaccionDto.fechaExpiracion);
      const status = cardIsValid && card ? mapEstadoTarjetaToRespuesta(card.estado) : EstadoRespuestaTransaccion.RECHAZADO;
      const previousStatus = transaccion.estado;

      await this.detalleRepository.save(
        this.detalleRepository.create({ //se aprueba la transaccion y se guarda un detalle
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

      transaccion.estado = mapEstadoApiToDb(status); //se guarda el estado de la transaccion en la base de datos
      transaccion.rrn = Math.floor(100000 + Math.random() * 900000);//se utiliza un random para simular un numero de referencia
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

      return { //se devuelven los resultados ya sea error o aprobar
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
    } catch (error) { //catch de error para manejar tokens invalidos
      const isJwtError = this.isExpectedJwtError(error);

      if (this.shouldPublishTechnicalAlert(error)) { // se levanta una alerta de rabbitmq
        await this.rabbitMqPublisherService.publishTransactionFailure({
          transactionId: payload?.transactionId ?? 'unknown',
          monto: payload?.monto,
          moneda: payload?.moneda,
          nombreComercio: payload?.nombreComercio,
          reason: error instanceof Error ? error.message : 'Error inesperado',
          errorName: error instanceof Error ? error.name : 'UnknownError',
          stage: payload ? 'process-transaction' : 'token-validation',
          occurredAt: new Date().toISOString(),
        });
      }
      //se envia un mensaje de error al frontend para que no se caiga la pagina
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const transactionId = payload?.transactionId ?? 'unknown';
      const redirectUrl = payload?.returnUrl
        ? `${payload.returnUrl}?status=RECHAZADO&transactionId=${transactionId}`
        : `${frontendUrl}?status=RECHAZADO&transactionId=${transactionId}`;

      return { //return estandar
        status: EstadoRespuestaTransaccion.RECHAZADO,
        message: isJwtError ? 'Token inválido o expirado' : 'Error interno al procesar la transacción',
        transactionId,
        redirectUrl,
      };
    }
  }

    private isExpectedJwtError(error: unknown): boolean { //funcion para indentificar errores
      if (!(error instanceof Error)) {
        return false;
      }

      const expectedJwtErrors = ['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'];
      return expectedJwtErrors.includes(error.name);
    }

  private shouldPublishTechnicalAlert(error: unknown): boolean { //bool para rabbitmq
    return !this.isExpectedJwtError(error);
  }

  async getDetalleTransaccion(id: number) { // get generico para obtener una transaccion
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
  async getHistorialTransaccion(id: string) { // get generico para obtener el historial de una transaccion
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
  async getAllTransacciones() { //get generico
    const transacciones = await this.transaccionRepository.find({ relations: ['detalles', 'historial'] });
    return transacciones;
  }
  async getAllDetalles() { //get generico
    const detalles = await this.detalleRepository.find({ relations: ['transaccion'] });
    return detalles;
  }
  async getAllHistoriales() { //get generico
    const historiales = await this.historialRepository.find({ relations: ['transaccion'] });
    return historiales;
  }
  
}
