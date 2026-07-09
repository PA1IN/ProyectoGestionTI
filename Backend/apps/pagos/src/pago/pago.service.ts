import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CheckoutDto } from './dto/checkout.dto';
import { MitDto } from './dto/mit.dto';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { Transaccion } from './entities/transaccion.entity';
import { EstadoTransaccionDb, TipoOperacionTransaccionDb } from './enums/transaccion.enum';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { MediosPagoService } from '../medios-pago/medios-pago.service';
import { TarjetaService } from '../tarjeta/tarjeta.service';
import { EstadoMandatoPagoDb, MandatoPago } from '../medios-pago/entities/mandato-pago.entity';
import { EstadoTarjetaGuardadaDb } from '../medios-pago/entities/tarjeta-guardada.entity';
import { CredencialComercio, EstadoCredencialComercioDb } from '../comercios/entities/credencial-comercio.entity';
import { CheckoutDetail, CheckoutQrResult, CreateTransactionResult, MitPaymentResult, ProcessTransactionResult, TransactionInfoResult, TransactionWebhookPayload } from './types/pago-response.types';
import { CheckoutPayload, TransactionPayload } from './types/pago-jwt-payload.types';
import { BancoEstadoOperacion } from '../tarjeta/types/banco.types';
import {
  RabbitMqService,
  AnalyticsTransactionEvent,
  TRANSACTION_EVENTS_ANALYTICS_QUEUE,
  TransactionAlert,
} from '@app/rmq';

const PAYMENT_EXPIRATION_QUEUE = 'pagos.expiracion';
const PAYMENT_EXPIRATION_DLX = 'pagos.expiracion.dlx';
const PAYMENT_EXPIRATION_DLQ = 'pagos.expiracion.dlq';
const PAYMENT_EXPIRATION_TTL_MS = 5 * 60 * 1000;
const ANALYTICS_WEBHOOK_URL = process.env.ANALYTICS_WEBHOOK_URL || 'http://localhost:8000/log';//'https://analisis-proyecto-ti.onrender.com/v1/events';
const ALERTAS_WEBHOOK_URL = process.env.ALERTAS_WEBHOOK_URL || 'http://localhost:8000/log';//https://proyecto11-mochicode.onrender.com/api/v1/alertas';

type PaymentExpirationJob = {
  transactionId: string;
  createdAt: string;
};

type Project9IntentPayload = {
  transaction_id: string;
  order_id: string | null;
  subscription_id?: string | null;
  monto: string;
  token_transaccion: string;
  timestamp_evento: string;
};

type Project9ConfirmPayload = {
  transaction_id: string;
  approved: boolean;
  codigo_error: 'insufficient_funds' | 'rejected' | null;
  token_transaccion: string;
  timestamp_evento: string;
};

type Project9Event = {
  source: 'payments';
  event_type: 'intento_pago' | 'confirmar_pago';
  payload: Project9IntentPayload | Project9ConfirmPayload;
};

@Injectable()
export class PagoService implements OnModuleInit {
  private readonly logger = new Logger(PagoService.name);
  private expirationInfrastructureReady?: Promise<void>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly rmqService: RabbitMqService,
    private readonly mediosPagoService: MediosPagoService,
    private readonly tarjetaService: TarjetaService,
    private readonly dataSource: DataSource,

    @InjectRepository(CredencialComercio)
    private readonly credencialComercioRepository: Repository<CredencialComercio>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(HistorialTransaccion)
    private readonly historialRepository: Repository<HistorialTransaccion>,
    @InjectRepository(DetalleTransaccion)
    private readonly detalleRepository: Repository<DetalleTransaccion>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureExpirationInfrastructure();
  }

  async processMitPayment(dto: MitDto, merchantCredentialId: string): Promise<MitPaymentResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const cardRecord = await this.mediosPagoService.buscarTarjetaPorToken(dto.paymentMethodToken);

    if (!cardRecord || cardRecord.estado !== EstadoTarjetaGuardadaDb.ACTIVA) {
      throw new NotFoundException('Medio de pago no encontrado');
    }

    const mandato = await this.mediosPagoService.buscarMandatoPorTarjetaYComercio(dto.paymentMethodToken, merchantCredential.id);

    if (!mandato) {
      throw new NotFoundException('No existe un mandato activo para este comercio');
    }

    const existingTransaction = await this.transaccionRepository.findOne({
      where: {
        idOrden: dto.idOrden,
        merchantCredentialId: merchantCredential.id,
        tipoOperacion: TipoOperacionTransaccionDb.MIT,
      },
    });

    if (existingTransaction) {
      const existingStatus = existingTransaction.estado === EstadoTransaccionDb.APROBADO
        ? EstadoRespuestaTransaccion.APROBADO
        : existingTransaction.estado === EstadoTransaccionDb.PENDIENTE
          ? EstadoRespuestaTransaccion.PENDIENTE
          : EstadoRespuestaTransaccion.RECHAZADO;

      if (existingStatus !== EstadoRespuestaTransaccion.PENDIENTE) {
        return {
          status: existingStatus,
          message: existingStatus === EstadoRespuestaTransaccion.APROBADO ? 'Transacción ya fue aprobada' : 'Transacción ya fue rechazado',
          transactionId: existingTransaction.id,
          paymentMethodToken: dto.paymentMethodToken,
          mandateId: existingTransaction.mandateId,
          card: {
            brand: cardRecord.brand,
            last4: cardRecord.last4,
            expMonth: cardRecord.expMonth,
            expYear: cardRecord.expYear,
          },
          customer: dto.customer,
        };
      }

      return {
        status: EstadoRespuestaTransaccion.PENDIENTE,
        message: 'La transacción ya está en proceso',
        transactionId: existingTransaction.id,
        paymentMethodToken: dto.paymentMethodToken,
        mandateId: existingTransaction.mandateId,
        card: {
          brand: cardRecord.brand,
          last4: cardRecord.last4,
          expMonth: cardRecord.expMonth,
          expYear: cardRecord.expYear,
        },
        customer: dto.customer,
      };
    }

    const transactionId = randomUUID();
    const rrn = this.generarRrn();
    const transaccionBase = {
      id: transactionId,
      monto: dto.monto.toFixed(2),
      moneda: dto.moneda.toUpperCase(),
      estado: EstadoTransaccionDb.PENDIENTE,
      idOrden: dto.idOrden,
      tipoOperacion: TipoOperacionTransaccionDb.MIT,
      merchantCredentialId: merchantCredential.id,
      paymentMethodToken: dto.paymentMethodToken,
      mandateId: mandato.id,
      rrn,
    };

    await this.publicarEventoAnalitica({
      merchantCredential,
      eventType: 'intento_pago',
      transactionId,
      orderId: dto.idOrden,
      subscriptionId: mandato.id,
      monto: dto.monto,
      moneda: dto.moneda.toUpperCase(),
      tokenTransaccion: mandato.id,
      approved: false,
      codigoError: null,
      paymentMethodLast4: cardRecord.last4,
      operationType: 'MIT',
    });

    const bancoRespuesta = await this.tarjetaService.autorizarBanco({
      numero: cardRecord.numeroPan,
      titular: cardRecord.holderName ?? dto.customer ?? 'ANONIMO',
      fechaExpiracion: `${String(cardRecord.expMonth).padStart(2, '0')}/${String(cardRecord.expYear).slice(-2)}`,
      monto: dto.monto,
    });

    const estadoFinal = bancoRespuesta.estado === BancoEstadoOperacion.RECHAZADA
      ? EstadoTransaccionDb.RECHAZADO
      : EstadoTransaccionDb.APROBADO;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let transaccionFinal: Transaccion;
    const rechazoPorFondosInsuficientes = estadoFinal === EstadoTransaccionDb.RECHAZADO
      && this.errorHelper(bancoRespuesta.message) === 'insufficient_funds';
    try {
      transaccionFinal = await queryRunner.manager.save(
        Transaccion,
        queryRunner.manager.create(Transaccion, {
          ...transaccionBase,
          estado: estadoFinal,
          tipoOperacion: TipoOperacionTransaccionDb.MIT,
          paymentMethodToken: dto.paymentMethodToken,
          mandateId: mandato.id,
          merchantCredentialId: merchantCredential.id,
        }),
      );

      await queryRunner.manager.save(
        DetalleTransaccion,
        queryRunner.manager.create(DetalleTransaccion, {
          transaccion: transaccionFinal,
          nombreUsuario: dto.customer ?? 'MIT',
          rut: '',
          tipoPago: TipoPagoDb.TARJETA,
          ultimosCuatro: cardRecord.last4,
          cuotas: estadoFinal === EstadoTransaccionDb.APROBADO ? 1 : 0,
          codigoAutorizacion: estadoFinal === EstadoTransaccionDb.APROBADO
            ? Math.random().toString(36).substring(2, 8).toUpperCase()
            : '',
          emisorTarjeta: cardRecord.brand ?? 'UNKNOWN',
          paymentMethodToken: dto.paymentMethodToken,
        }),
      );

      await queryRunner.manager.save(
        HistorialTransaccion,
        queryRunner.manager.create(HistorialTransaccion, {
          transaccion: transaccionFinal,
          statusFrom: EstadoTransaccionDb.PENDIENTE,
          statusTo: estadoFinal,
        }),
      );

      if (rechazoPorFondosInsuficientes) {
        await queryRunner.manager.save(
          MandatoPago,
          queryRunner.manager.create(MandatoPago, {
            ...mandato,
            estado: EstadoMandatoPagoDb.SUSPENDIDO,
          }),
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    if (estadoFinal === EstadoTransaccionDb.RECHAZADO) {
      await this.publicarEventoAnalitica({
        merchantCredential,
        eventType: 'confirmar_pago',
        transactionId: transaccionFinal.id,
        orderId: dto.idOrden,
        subscriptionId: mandato.id,
        monto: dto.monto,
        moneda: dto.moneda.toUpperCase(),
        tokenTransaccion: mandato.id,
        approved: false,
        codigoError: this.errorHelper(bancoRespuesta.message),
        paymentMethodLast4: cardRecord.last4,
        operationType: 'MIT',
      });

      await this.notificarWebhookComercio(merchantCredential, {
        event: 'transaction.rejected',
        transactionId: transaccionFinal.id,
        idOrden: dto.idOrden,
        operationType: 'MIT',
        status: EstadoRespuestaTransaccion.RECHAZADO,
        monto: dto.monto,
        moneda: dto.moneda.toUpperCase(),
        mandateId: mandato.id,
        paymentMethodToken: dto.paymentMethodToken,
        customer: dto.customer,
        card: {
          brand: cardRecord.brand,
          last4: cardRecord.last4,
          expMonth: cardRecord.expMonth,
          expYear: cardRecord.expYear,
        },
        timestamp: new Date().toISOString(),
      });

      return {
        status: EstadoRespuestaTransaccion.RECHAZADO,
        message: bancoRespuesta.message,
        transactionId: transaccionFinal.id,
        paymentMethodToken: dto.paymentMethodToken,
        mandateId: mandato.id,
        card: {
          brand: cardRecord.brand,
          last4: cardRecord.last4,
          expMonth: cardRecord.expMonth,
          expYear: cardRecord.expYear,
        },
        customer: dto.customer,
      };
    }

    await this.publicarEventoAnalitica({
      merchantCredential,
      eventType: 'confirmar_pago',
      transactionId: transaccionFinal.id,
      orderId: dto.idOrden,
      subscriptionId: mandato.id,
      monto: dto.monto,
      moneda: dto.moneda.toUpperCase(),
      tokenTransaccion: mandato.id,
      approved: true,
      codigoError: null,
      paymentMethodLast4: cardRecord.last4,
      operationType: 'MIT',
    });

    await this.notificarWebhookComercio(merchantCredential, {
      event: 'transaction.approved',
      transactionId: transaccionFinal.id,
      idOrden: dto.idOrden,
      operationType: 'MIT',
      status: EstadoRespuestaTransaccion.APROBADO,
      monto: dto.monto,
      moneda: dto.moneda.toUpperCase(),
      mandateId: mandato.id,
      paymentMethodToken: dto.paymentMethodToken,
      customer: dto.customer,
      card: {
        brand: cardRecord.brand,
        last4: cardRecord.last4,
        expMonth: cardRecord.expMonth,
        expYear: cardRecord.expYear,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Suscripcion procesada correctamente',
      transactionId: transaccionFinal.id,
      paymentMethodToken: dto.paymentMethodToken,
      mandateId: mandato.id,
      card: {
        brand: cardRecord.brand,
        last4: cardRecord.last4,
        expMonth: cardRecord.expMonth,
        expYear: cardRecord.expYear,
      },
      customer: dto.customer,
    };
  }
  async createTransaction(createTransaccionDto: CreateTransaccionDto, merchantCredentialId?: string): Promise<CreateTransactionResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const expiresInRaw = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const expiresIn = /^\d+$/.test(expiresInRaw)
      ? Number(expiresInRaw)
      : (expiresInRaw as StringValue);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const existingTransaction = await this.transaccionRepository.findOne({
      where: { idOrden: createTransaccionDto.idOrden },
    });

    if (existingTransaction) {
      if (
        existingTransaction.monto !== createTransaccionDto.monto.toFixed(2) ||
        existingTransaction.moneda !== createTransaccionDto.moneda ||
        existingTransaction.merchantCredentialId !== merchantCredential.id
      ) {
        await this.publicarAlertaMontoManipulado({
          merchantCredential,
          transactionId: existingTransaction.id,
          montoOriginal: Number(existingTransaction.monto),
          montoCobrado: createTransaccionDto.monto,
        });

        throw new ConflictException('El id de orden ya fue utilizado con otra solicitud');
      }

      const existingPayload: TransactionPayload = {
        transactionId: existingTransaction.id,
        idOrden: existingTransaction.idOrden,
        monto: createTransaccionDto.monto,
        moneda: createTransaccionDto.moneda,
        nombreComercio: merchantCredential.nombreComercio,
        returnUrl: createTransaccionDto.returnUrl,
        iatAt: new Date().toISOString(),
      };

      const token = await this.jwtService.signAsync(existingPayload, { expiresIn });

      return {
        token,
        transactionUrl: `${frontendUrl}/checkout/${encodeURIComponent(token)}`,
        transactionId: existingTransaction.id,
        tokenType: 'Bearer',
        expiresIn: expiresInRaw,
      };
    }

    const transactionId = randomUUID();
    const rrn = this.generarRrn();

    const payload: TransactionPayload = {
      transactionId,
      idOrden: createTransaccionDto.idOrden,
      monto: createTransaccionDto.monto,
      moneda: createTransaccionDto.moneda,
      nombreComercio: merchantCredential.nombreComercio,
      returnUrl: createTransaccionDto.returnUrl,
      iatAt: new Date().toISOString(),
    };

    const token = await this.jwtService.signAsync(payload, { expiresIn });
    const transactionUrl = `${frontendUrl}/checkout/${encodeURIComponent(token)}`;

    await this.transaccionRepository.save(
      this.transaccionRepository.create({
        id: transactionId,
        idOrden: createTransaccionDto.idOrden,
        monto: createTransaccionDto.monto.toFixed(2),
        moneda: createTransaccionDto.moneda.toUpperCase(),
        estado: EstadoTransaccionDb.PENDIENTE,
        tipoOperacion: TipoOperacionTransaccionDb.CIT,
        merchantCredentialId: merchantCredential.id,
        paymentMethodToken: null,
        mandateId: null,
        rrn,
      }),
    );

    await this.programarExpiracionTransaccion(transactionId);

    await this.publicarEventoAnalitica({
      merchantCredential,
      eventType: 'intento_pago',
      transactionId,
      orderId: createTransaccionDto.idOrden,
      monto: createTransaccionDto.monto,
      moneda: createTransaccionDto.moneda,
      tokenTransaccion: token,
      approved: false,
      codigoError: null,
      paymentMethodLast4: null,
      operationType: 'CIT',
    });

    return {
      token,
      transactionUrl,
      transactionId,
      tokenType: 'Bearer',
      expiresIn: expiresInRaw,
    };
  }

  async getCheckoutTransaccion(token: string): Promise<CheckoutDetail> {
    try {
      const payload = await this.jwtService.verifyAsync<CheckoutPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const transaccion = await this.transaccionRepository.findOne({
        where: { id: payload.transactionId },
        relations: ['detalles'],
      });

      const merchantCredential = transaccion?.merchantCredentialId
        ? await this.resolveMerchantCredential(transaccion.merchantCredentialId)
        : null;

      let estado: EstadoRespuestaTransaccion = EstadoRespuestaTransaccion.PENDIENTE;

      if (transaccion) {
        if (
          transaccion.estado === EstadoTransaccionDb.RECHAZADO || 
          transaccion.estado === EstadoTransaccionDb.FALLIDO
        ) {
          estado = EstadoRespuestaTransaccion.RECHAZADO;
        } else if (transaccion.estado === EstadoTransaccionDb.APROBADO) {
          estado = EstadoRespuestaTransaccion.APROBADO;
        } else {
          estado = EstadoRespuestaTransaccion.PENDIENTE;
        }
      }

      const detalle = transaccion?.detalles?.[0] ?? null;

      return {
        token,
        comercio: merchantCredential?.nombreComercio ?? payload.nombreComercio,
        montoTotal: payload.monto,
        moneda: payload.moneda,
        returnUrl: payload.returnUrl,
        estado,
        tarjeta: detalle
          ? {
              marca: detalle.emisorTarjeta ?? null,
              ultimosCuatro: detalle.ultimosCuatro ?? null,
            }
          : null,
        rrn: transaccion?.rrn ?? null,
        tipoOperacion: transaccion?.tipoOperacion ?? null,
        codigoAutorizacion: detalle?.codigoAutorizacion ?? null,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async getTransactionInfo(transactionId: string, merchantCredentialId?: string): Promise<TransactionInfoResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);

    const transaccion = await this.transaccionRepository.findOne({
      where: { id: transactionId },
      relations: ['detalles'],
    });

    if (!transaccion) {
      throw new NotFoundException('Transacción no encontrada');
    }

    if (transaccion.merchantCredentialId && transaccion.merchantCredentialId !== merchantCredential.id) {
      throw new UnauthorizedException('La transacción no pertenece al comercio autenticado');
    }

    const detalle = transaccion.detalles?.[0] ?? null;

    return {
      transactionId: transaccion.id,
      orderId: transaccion.idOrden,
      paymentInfo: {
        status: this.mapEstadoRespuestaTransaccion(transaccion.estado),
        paymentType: detalle?.tipoPago ?? null,
        amount: Number(transaccion.monto),
        currency: transaccion.moneda,
        operationType: transaccion.tipoOperacion ?? null,
        rrn: transaccion.rrn ?? null,
        authorizationCode: detalle?.codigoAutorizacion ?? null,
        cardIssuer: detalle?.emisorTarjeta ?? null,
        last4Digits: detalle?.ultimosCuatro ?? null,
        installments: detalle?.cuotas ?? null,
      },
    };
  }

  async generateCheckoutQr(token: string): Promise<CheckoutQrResult> {
    try {
      const payload = await this.jwtService.verifyAsync<CheckoutPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const transaccion = await this.transaccionRepository.findOne({
        where: { id: payload.transactionId },
      });

      if (!transaccion) {
        throw new NotFoundException('Transacción no encontrada');
      }

      if (transaccion.estado !== EstadoTransaccionDb.PENDIENTE) {
        throw new ConflictException('La transacción ya fue procesada');
      }

      const qrPayload = {
        transactionId: payload.transactionId,
        idOrden: payload.idOrden,
        monto: payload.monto,
        moneda: payload.moneda,
        nombreComercio: payload.nombreComercio,
        returnUrl: payload.returnUrl,
        medioPago: 'QR' as const,
        generatedAt: new Date().toISOString(),
      };

      const qrData = await this.jwtService.signAsync(qrPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '10m',
      });

      return {
        status: EstadoRespuestaTransaccion.APROBADO,
        message: 'QR generado correctamente',
        transactionId: transaccion.id,
        qrData,
        returnUrl: payload.returnUrl,
        codigoQr: qrData,
      };
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async processTransaction(token: string, checkoutDto: CheckoutDto, merchantCredentialId?: string): Promise<ProcessTransactionResult> {
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

      const merchantIdToUse = merchantCredentialId ?? transaccion.merchantCredentialId;
      if (!merchantIdToUse) {
        throw new UnauthorizedException('No se recibió credencial del comercio');
      }
      const merchantCredential = await this.resolveMerchantCredential(merchantIdToUse);
      if (payload.idOrden !== transaccion.idOrden) {
        throw new UnauthorizedException('El id de orden no coincide con la transacción');
      }

      if (transaccion.estado !== EstadoTransaccionDb.PENDIENTE) {
        const status = transaccion.estado === EstadoTransaccionDb.APROBADO
          ? EstadoRespuestaTransaccion.APROBADO
          : EstadoRespuestaTransaccion.RECHAZADO;

        return {
          status,
          message: status === EstadoRespuestaTransaccion.APROBADO ? 'Transacción ya aprobada' : 'Transacción ya rechazada',
          redirectUrl: `${payload.returnUrl}?status=${status}&transactionId=${transaccion.id}`,
          transactionId: transaccion.id,
          details: {
            monto: payload.monto,
            moneda: payload.moneda,
            nombreComercio: payload.nombreComercio,
          },
        };
      }
      const previousStatus = transaccion.estado;
      const last4 = checkoutDto.numeroTarjeta.slice(-4);
      const brand = this.tarjetaService.detectarMarcaTarjeta(checkoutDto.numeroTarjeta);

      const bancoRespuesta = await this.tarjetaService.autorizarBanco({
        numero: checkoutDto.numeroTarjeta,
        titular: checkoutDto.titular ?? 'ANONIMO',
        fechaExpiracion: checkoutDto.fechaExpiracion,
        cvv: checkoutDto.cvv,
        monto: payload.monto,
      });

      const estadoFinal = bancoRespuesta.estado === BancoEstadoOperacion.RECHAZADA
        ? EstadoTransaccionDb.RECHAZADO
        : EstadoTransaccionDb.APROBADO;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      let transaccionFinal: Transaccion;
      try {
        transaccionFinal = await queryRunner.manager.save(
          Transaccion,
          queryRunner.manager.create(Transaccion, {
            ...transaccion,
            estado: estadoFinal,
            tipoOperacion: TipoOperacionTransaccionDb.CIT,
            paymentMethodToken: null,
            mandateId: null,
            merchantCredentialId: merchantCredential.id,
          }),
        );

        await queryRunner.manager.save(
          DetalleTransaccion,
          queryRunner.manager.create(DetalleTransaccion, {
            transaccion: transaccionFinal,
            nombreUsuario: checkoutDto.titular ?? 'ANONIMO',
            rut: '',
            tipoPago: TipoPagoDb.TARJETA,
            ultimosCuatro: last4,
            cuotas: estadoFinal === EstadoTransaccionDb.APROBADO ? 1 : 0,
            codigoAutorizacion: estadoFinal === EstadoTransaccionDb.APROBADO
              ? Math.random().toString(36).substring(2, 8).toUpperCase()
              : '',
            emisorTarjeta: brand,
            paymentMethodToken: null,
          }),
        );

        await queryRunner.manager.save(
          HistorialTransaccion,
          queryRunner.manager.create(HistorialTransaccion, {
            transaccion: transaccionFinal,
            statusFrom: previousStatus,
            statusTo: estadoFinal,
          }),
        );

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }

      if (estadoFinal === EstadoTransaccionDb.RECHAZADO) {
        await this.publicarEventoAnalitica({
          merchantCredential,
          eventType: 'confirmar_pago',
          transactionId: transaccionFinal.id,
          orderId: payload.idOrden,
          monto: payload.monto,
          moneda: payload.moneda,
          tokenTransaccion: token,
          approved: false,
          codigoError: this.errorHelper(bancoRespuesta.message),
          paymentMethodLast4: last4,
          operationType: 'CIT',
        });

        await this.notificarWebhookComercio(merchantCredential, {
          event: 'transaction.rejected',
          transactionId: transaccionFinal.id,
          idOrden: payload.idOrden,
          operationType: 'CIT',
          status: EstadoRespuestaTransaccion.RECHAZADO,
          monto: payload.monto,
          moneda: payload.moneda,
          card: {
            brand,
            last4,
            expMonth: this.parseMonthFromExpiry(checkoutDto.fechaExpiracion),
            expYear: this.parseYearFromExpiry(checkoutDto.fechaExpiracion),
          },
          timestamp: new Date().toISOString(),
        });

        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: bancoRespuesta.message,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${transaccionFinal.id}`,
          transactionId: transaccionFinal.id,
          details: {
            monto: payload.monto,
            moneda: payload.moneda,
            nombreComercio: payload.nombreComercio,
          },
        };
      }

      await this.publicarEventoAnalitica({
        merchantCredential,
        eventType: 'confirmar_pago',
        transactionId: transaccionFinal.id,
        orderId: payload.idOrden,
        monto: payload.monto,
        moneda: payload.moneda,
        tokenTransaccion: token,
        approved: true,
        codigoError: null,
        paymentMethodLast4: last4,
        operationType: 'CIT',
      });

      await this.notificarWebhookComercio(merchantCredential, {
        event: 'transaction.approved',
        transactionId: transaccionFinal.id,
        idOrden: payload.idOrden,
        operationType: 'CIT',
        status: EstadoRespuestaTransaccion.APROBADO,
        monto: payload.monto,
        moneda: payload.moneda,
        card: {
          brand,
          last4,
          expMonth: this.parseMonthFromExpiry(checkoutDto.fechaExpiracion),
          expYear: this.parseYearFromExpiry(checkoutDto.fechaExpiracion),
        },
        timestamp: new Date().toISOString(),
      });

      const isApproved = estadoFinal === EstadoTransaccionDb.APROBADO;
      const finalTransactionId = transaccionFinal.id;

      return {
        status: isApproved ? EstadoRespuestaTransaccion.APROBADO : EstadoRespuestaTransaccion.RECHAZADO,
        message: isApproved ? 'Transacción aprobada' : 'Transacción rechazada',
        redirectUrl: `${payload.returnUrl}?status=${isApproved ? EstadoRespuestaTransaccion.APROBADO : EstadoRespuestaTransaccion.RECHAZADO}&transactionId=${finalTransactionId}`,
        transactionId: finalTransactionId,
        details: {
          monto: payload.monto,
          moneda: payload.moneda,
          nombreComercio: payload.nombreComercio,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error al procesar la transacción',
        error instanceof Error ? error.stack : String(error),
      );
      return {
        status: EstadoRespuestaTransaccion.RECHAZADO,
        message: 'Token inválido o expirado',
        transactionId: 'unknown',
        redirectUrl: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}?status=RECHAZADO&transactionId=unknown`,
      };
    }
  }
  async processQrTransaction(token: string, merchantCredentialId?: string): Promise<ProcessTransactionResult> {
    try {
      // Verificar QR
      const payload = await this.jwtService.verifyAsync<any>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Validación
      if (payload.medioPago !== 'QR') {
        throw new UnauthorizedException('El token provisto no corresponde a una operación por QR');
      }

      // 2. Buscamos la transaccion
      const transaccion = await this.transaccionRepository.findOne({ where: { id: payload.transactionId } });
      if (!transaccion) {
        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: 'Transacción no encontrada',
          transactionId: payload.transactionId,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${payload.transactionId}`,
        };
      }

      const merchantIdToUse = merchantCredentialId ?? transaccion.merchantCredentialId;
      if (!merchantIdToUse) {
        throw new UnauthorizedException('No se recibió credencial del comercio');
      }
      const merchantCredential = await this.resolveMerchantCredential(merchantIdToUse);

      // 3. Validar si la transacción ya fue procesada previamente
      if (transaccion.estado !== EstadoTransaccionDb.PENDIENTE) {
        const status = transaccion.estado === EstadoTransaccionDb.APROBADO
          ? EstadoRespuestaTransaccion.APROBADO
          : EstadoRespuestaTransaccion.RECHAZADO;

        return {
          status,
          message: status === EstadoRespuestaTransaccion.APROBADO ? 'Transacción ya aprobada' : 'Transacción ya rechazada',
          redirectUrl: `${payload.returnUrl}?status=${status}&transactionId=${transaccion.id}`,
          transactionId: transaccion.id,
          details: {
            monto: payload.monto,
            moneda: payload.moneda,
            nombreComercio: payload.nombreComercio,
          },
        };
      }

      const previousStatus = transaccion.estado;
      const status = EstadoRespuestaTransaccion.APROBADO;

      // 4. Guardar el detalle de la transacción
      await this.detalleRepository.save(
        this.detalleRepository.create({
          transaccion,
          nombreUsuario: 'COMPRADOR_QR_SIMULADO',
          rut: '',
          tipoPago: TipoPagoDb.QR ,
          ultimosCuatro: null,   // No aplica para QR
          cuotas: 1,
          codigoAutorizacion: Math.random().toString(36).substring(2, 8).toUpperCase(),
          emisorTarjeta: 'BILLETERA_DIGITAL', 
          paymentMethodToken: null,
        }),
      );

      // 5. Actualizar el estado de la transacción principal
      transaccion.estado = EstadoTransaccionDb.APROBADO;
      transaccion.tipoOperacion = TipoOperacionTransaccionDb.CIT;
      await this.transaccionRepository.save(transaccion);

      // 6. Registrar el cambio de estado en el historial
      await this.historialRepository.save(
        this.historialRepository.create({
          transaccion,
          statusFrom: previousStatus,
          statusTo: EstadoTransaccionDb.APROBADO,
        }),
      );

      await this.publicarEventoAnalitica({
      merchantCredential,
        eventType: 'confirmar_pago',
        transactionId: transaccion.id,
        orderId: payload.idOrden,
        monto: payload.monto,
        moneda: payload.moneda,
        tokenTransaccion: token,
        approved: true,
        codigoError: null,
        paymentMethodLast4: null,
        operationType: 'CIT',
      });

      // 8. Retornar la respuesta con la URL de redirección al flujo frontend
      return {
        status,
        message: 'Transacción QR aprobada exitosamente (Simulado)',
        redirectUrl: `${payload.returnUrl}?status=${status}&transactionId=${transaccion.id}`,
        transactionId: transaccion.id,
        details: {
          monto: payload.monto,
          moneda: payload.moneda,
          nombreComercio: payload.nombreComercio,
        },
      };

    } catch (error) {
      this.logger.error(
        'Error al procesar la transacción QR',
        error instanceof Error ? error.stack : String(error),
      );
      throw new UnauthorizedException('Token de QR inválido o expirado');
    }
  }

  private async resolveMerchantCredential(merchantCredentialId?: string) {
    if (!merchantCredentialId) {
      throw new UnauthorizedException('No se recibió credencial del comercio');
    }

    const merchantCredential = await this.credencialComercioRepository.findOne({
      where: { id: merchantCredentialId, estado: EstadoCredencialComercioDb.ACTIVA },
    });

    if (!merchantCredential) {
      throw new UnauthorizedException('No hay comercio autorizado disponible');
    }

    return merchantCredential;
  }

  private async notificarWebhookComercio<TPayload>(
    merchantCredential: CredencialComercio,
    payload: TPayload,
  ): Promise<void> {
    if (!merchantCredential.webhookUrl) {
      this.logger.debug(`Webhook omitido para ${merchantCredential.id}: no hay URL configurada`);
      return;
    }

    await this.enviarWebhookDirecto(merchantCredential.webhookUrl, payload, `merchant ${merchantCredential.id}`);
  }

  private async publicarEventoAnalitica(params: {
    merchantCredential: CredencialComercio;
    eventType: 'intento_pago' | 'confirmar_pago';
    transactionId: string;
    orderId: string | null;
    subscriptionId?: string | null;
    monto: number;
    moneda: string;
    tokenTransaccion: string;
    approved: boolean;
    codigoError: 'insufficient_funds' | 'rejected' | null;
    paymentMethodLast4: string | null;
    operationType: 'CIT' | 'MIT';
  }): Promise<void> {
    const timestampEvento = new Date().toISOString();

    const analyticsRetryEvent: AnalyticsTransactionEvent = {
      source: 'payments',
      event_type: params.eventType,
      payload: {
        transaction_id: params.transactionId,
        order_id: params.orderId,
        merchant_credential_id: params.merchantCredential.id,
        webhook_url: params.merchantCredential.webhookUrl ?? null,
        ...(params.operationType === 'MIT' && params.subscriptionId ? { subscription_id: params.subscriptionId } : {}),
        monto: params.monto,
        moneda: params.moneda,
        token_transaccion: params.tokenTransaccion,
        payment_method_last4: params.paymentMethodLast4,
        approved: params.approved,
        codigo_error: params.codigoError,
        operation_type: params.operationType,
        timestamp_evento: timestampEvento,
      },
    };

    await this.publicarEnRabbitSeguro(TRANSACTION_EVENTS_ANALYTICS_QUEUE, analyticsRetryEvent);

    const analyticsEvent: Project9Event = params.eventType === 'intento_pago'
      ? {
          source: 'payments',
          event_type: 'intento_pago',
          payload: {
            transaction_id: params.transactionId,
            order_id: params.orderId,
            ...(params.operationType === 'MIT' && params.subscriptionId ? { subscription_id: params.subscriptionId } : {}),
            monto: params.monto.toFixed(2),
            token_transaccion: params.tokenTransaccion,
            timestamp_evento: timestampEvento,
          },
        }
      : {
          source: 'payments',
          event_type: 'confirmar_pago',
          payload: {
            transaction_id: params.transactionId,
            approved: params.approved,
            codigo_error: params.codigoError,
            token_transaccion: params.tokenTransaccion,
            timestamp_evento: timestampEvento,
          },
        };

    await this.enviarWebhookDirecto(ANALYTICS_WEBHOOK_URL, analyticsEvent, 'analytics');
  }

  private errorHelper(message: string | null): 'insufficient_funds' | 'rejected' {
    if (message && /saldo insuficiente/i.test(message)) {
      return 'insufficient_funds';
    }

    return 'rejected';
  }

  private mapEstadoRespuestaTransaccion(estado: EstadoTransaccionDb): EstadoRespuestaTransaccion {
    if (estado === EstadoTransaccionDb.APROBADO) {
      return EstadoRespuestaTransaccion.APROBADO;
    }

    if (estado === EstadoTransaccionDb.RECHAZADO || estado === EstadoTransaccionDb.FALLIDO) {
      return EstadoRespuestaTransaccion.RECHAZADO;
    }

    return EstadoRespuestaTransaccion.PENDIENTE;
  }

  private async publicarAlertaMontoManipulado(params: {
    merchantCredential: CredencialComercio;
    transactionId: string;
    montoOriginal: number;
    montoCobrado: number;
  }): Promise<void> {
    const alerta: TransactionAlert = {
      sistema_id: 'P04',
      creado_en: new Date().toISOString(),
      payload: {
        tipo: 'Transaccion',
        error: 'NOT_EQUAL',
        id_transaccion: params.transactionId,
        monto_original: params.montoOriginal,
        monto_cobrado: params.montoCobrado,
      },
    };

    await this.enviarWebhookDirecto(ALERTAS_WEBHOOK_URL, alerta, 'alerts');
  }

  private async publicarEnRabbitSeguro<T>(queueName: string, payload: T): Promise<void> {
    try {
      await this.rmqService.publish<T>(queueName, payload);
    } catch (error) {
      this.logger.warn(
        `Publicación omitida en ${queueName}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async enviarWebhookDirecto<TPayload>(url: string, payload: TPayload, context: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar webhook ${context} a ${url}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private parseMonthFromExpiry(fechaExpiracion: string): number | null {
    const month = Number(fechaExpiracion.split('/')[0]);
    return Number.isFinite(month) ? month : null;
  }

  private parseYearFromExpiry(fechaExpiracion: string): number | null {
    const [, yearPart = ''] = fechaExpiracion.split('/');
    if (!yearPart) {
      return null;
    }

    const normalizedYear = yearPart.length === 2 ? Number(`20${yearPart}`) : Number(yearPart);
    return Number.isFinite(normalizedYear) ? normalizedYear : null;
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
      paymentMethodToken: detalle.paymentMethodToken,
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
  async getAllTransacciones(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    const transacciones = await this.transaccionRepository.find({
      relations: ['detalles', 'historial'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return transacciones;
  }
  async getAllDetalles(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    const detalles = await this.detalleRepository.find({
      relations: ['transaccion'],
      order: { id: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return detalles;
  }
  async getAllHistoriales(pagination: { page: number; limit: number } = { page: 1, limit: 20 }) {
    const historiales = await this.historialRepository.find({
      relations: ['transaccion'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return historiales;
  }

  private generarRrn(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  private async ensureExpirationInfrastructure(): Promise<void> {
    if (!this.expirationInfrastructureReady) {
      this.expirationInfrastructureReady = (async () => {
        await this.rmqService.assertExchange(PAYMENT_EXPIRATION_DLX, 'direct', { durable: true });
        await this.rmqService.assertQueue(PAYMENT_EXPIRATION_DLQ, { durable: true });
        await this.rmqService.bindQueue(PAYMENT_EXPIRATION_DLQ, PAYMENT_EXPIRATION_DLX, PAYMENT_EXPIRATION_DLQ);
        await this.rmqService.assertQueue(PAYMENT_EXPIRATION_QUEUE, {
          durable: true,
          arguments: {
            'x-message-ttl': PAYMENT_EXPIRATION_TTL_MS,
            'x-dead-letter-exchange': PAYMENT_EXPIRATION_DLX,
            'x-dead-letter-routing-key': PAYMENT_EXPIRATION_DLQ,
          },
        });

        await this.rmqService.consume<PaymentExpirationJob>(PAYMENT_EXPIRATION_DLQ, async (payload) => {
          await this.procesarExpiracionTransaccion(payload.transactionId);
        });
      })().catch((error) => {
        this.expirationInfrastructureReady = undefined;
        throw error;
      });
    }

    await this.expirationInfrastructureReady;
  }

  private async programarExpiracionTransaccion(transactionId: string): Promise<void> {
    await this.ensureExpirationInfrastructure();

    await this.publicarEnRabbitSeguro(PAYMENT_EXPIRATION_QUEUE, {
      transactionId,
      createdAt: new Date().toISOString(),
    });
  }

  private async procesarExpiracionTransaccion(transactionId: string): Promise<void> {
    const transaccion = await this.transaccionRepository.findOne({
      where: { id: transactionId },
      relations: ['detalles'],
    });

    if (!transaccion || transaccion.estado !== EstadoTransaccionDb.PENDIENTE) {
      return;
    }

    const estadoAnterior = transaccion.estado;
    transaccion.estado = EstadoTransaccionDb.RECHAZADO;

    await this.transaccionRepository.save(transaccion);

    await this.historialRepository.save(
      this.historialRepository.create({
        transaccion,
        statusFrom: estadoAnterior,
        statusTo: EstadoTransaccionDb.RECHAZADO,
      }),
    );

    if (!transaccion.merchantCredentialId) {
      return;
    }

    const merchantCredential = await this.credencialComercioRepository.findOne({
      where: { id: transaccion.merchantCredentialId, estado: EstadoCredencialComercioDb.ACTIVA },
    });

    if (!merchantCredential) {
      return;
    }

    const payload: TransactionWebhookPayload = {
      event: 'transaction.rejected',
      transactionId: transaccion.id,
      idOrden: transaccion.idOrden,
      operationType: transaccion.tipoOperacion ?? TipoOperacionTransaccionDb.CIT,
      status: EstadoRespuestaTransaccion.RECHAZADO,
      monto: Number(transaccion.monto),
      moneda: transaccion.moneda,
      card: transaccion.detalles?.[0]
        ? {
            brand: transaccion.detalles[0].emisorTarjeta ?? null,
            last4: transaccion.detalles[0].ultimosCuatro ?? null,
            expMonth: null,
            expYear: null,
          }
        : null,
      timestamp: new Date().toISOString(),
    };

    await this.notificarWebhookComercio(merchantCredential, payload);
  }

  async getComprobante(transactionId: string) {
    const transaccion = await this.transaccionRepository.findOne({
      where: { id: transactionId },
      
      relations: ['detalles'], 
    });

    if (!transaccion) {
      throw new NotFoundException('Transacción no encontrada');
    }

    
    let comercio: CredencialComercio | null = null;
    
    if (transaccion.merchantCredentialId) {
      comercio = await this.credencialComercioRepository.findOne({
        where: { id: transaccion.merchantCredentialId }
      });
    }
    
    return {
      montoTotal: Number(transaccion.monto),
      moneda: transaccion.moneda,
      nombreComercio: comercio?.nombreComercio ?? 'Comercio no registrado',
      
      fechaHora: transaccion['createdAt'] ?? new Date().toISOString(), 
      numeroOrden: transaccion.idOrden,
      estado: transaccion.estado,
      
      codigoAutorizacion: transaccion.detalles?.[0]?.codigoAutorizacion ?? null,
      metodoPago: transaccion.detalles?.[0]?.tipoPago ?? null,
      ultimosCuatro: transaccion.detalles?.[0]?.ultimosCuatro ?? null,
    };
  }
  
}
