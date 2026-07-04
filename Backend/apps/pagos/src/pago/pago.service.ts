import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { StringValue } from 'ms';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CheckoutDto } from './dto/checkout.dto';
import { MitDto } from './dto/mit.dto';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { Transaccion } from './entities/transaccion.entity';
import { EstadoTransaccionDb, TipoOperacionTransaccionDb } from './enums/transaccion.enum';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { MediosPagoService } from '../medios-pago/medios-pago.service';
import { TarjetaService } from '../tarjeta/tarjeta.service';
import { CredencialComercio, EstadoCredencialComercioDb } from '../comercios/entities/credencial-comercio.entity';
import { CheckoutDetail, CreateTransactionResult, MitPaymentResult, ProcessTransactionResult } from './types/pago-response.types';
import { CheckoutPayload, TransactionPayload } from './types/pago-jwt-payload.types';
import { BancoEstadoOperacion } from '../tarjeta/types/banco.types';
import {
  RabbitMqService,
  TRANSACTION_ALERTS_ANALYTICS_QUEUE,
  TRANSACTION_EVENTS_ANALYTICS_QUEUE,
  AnalyticsTransactionEventEnvelope,
  TransactionAlert,
  TransactionWebhookErrorCode,
  TransactionWebhookEvent,
  WebhookJob,
} from '@app/rmq';

@Injectable()
export class PagoService {
  private readonly logger = new Logger(PagoService.name);

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

  async processMitPayment(dto: MitDto, merchantCredentialId: string): Promise<MitPaymentResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const cardRecord = await this.mediosPagoService.buscarTarjetaPorToken(dto.paymentMethodToken);

    if (!cardRecord) {
      throw new NotFoundException('Medio de pago no encontrado');
    }

    const mandato = await this.mediosPagoService.buscarMandatoPorTarjetaYComercio(dto.paymentMethodToken, merchantCredential.id);

    if (!mandato) {
      const transactionId = randomUUID();
      const transaccionRechazada = await this.ejecutarTransaccion(async (manager) => {
        const transaccion = await manager.save(
          Transaccion,
          manager.create(Transaccion, {
            id: transactionId,
            monto: dto.monto.toFixed(2),
            moneda: dto.moneda.toUpperCase(),
            estado: EstadoTransaccionDb.RECHAZADO,
            idOrden: dto.idOrden,
            tipoOperacion: TipoOperacionTransaccionDb.MIT,
            merchantCredentialId: merchantCredential.id,
            paymentMethodToken: dto.paymentMethodToken,
            mandateId: null,
          }),
        );

        await manager.save(
          DetalleTransaccion,
          manager.create(DetalleTransaccion, {
            transaccion,
            nombreUsuario: dto.customer ?? 'MIT',
            rut: '',
            tipoPago: TipoPagoDb.TARJETA,
            ultimosCuatro: cardRecord.last4,
            cuotas: 0,
            codigoAutorizacion: '',
            emisorTarjeta: cardRecord.brand ?? 'UNKNOWN',
            paymentMethodToken: dto.paymentMethodToken,
          }),
        );

        await manager.save(
          HistorialTransaccion,
          manager.create(HistorialTransaccion, {
            transaccion,
            statusFrom: EstadoTransaccionDb.PENDIENTE,
            statusTo: EstadoTransaccionDb.RECHAZADO,
          }),
        );

        return transaccion;
      });

      await this.publicarEventoTransaccion({
        merchantCredential,
        eventType: 'intento_pago',
        transactionId,
        orderId: dto.idOrden,
        subscriptionId: null,
        monto: dto.monto,
        moneda: dto.moneda.toUpperCase(),
        tokenTransaccion: cardRecord.id,
        approved: false,
        codigoError: 'NO_MANDATE',
        paymentMethodLast4: cardRecord.last4,
        operationType: 'MIT',
        publishExternal: true,
      });

      return {
        status: EstadoRespuestaTransaccion.RECHAZADO,
        message: 'No existe un mandato activo para este comercio',
        transactionId: transaccionRechazada.id,
        paymentMethodToken: dto.paymentMethodToken,
        mandateId: null,
        card: {
          brand: cardRecord.brand,
          last4: cardRecord.last4,
          expMonth: cardRecord.expMonth,
          expYear: cardRecord.expYear,
        },
        customer: dto.customer,
      };
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
    };

    await this.publicarEventoTransaccion({
      merchantCredential,
      eventType: 'intento_pago',
      transactionId,
      orderId: dto.idOrden,
      subscriptionId: mandato.id,
      monto: dto.monto,
      moneda: dto.moneda.toUpperCase(),
      tokenTransaccion: cardRecord.id,
      approved: false,
      codigoError: null,
      paymentMethodLast4: cardRecord.last4,
      operationType: 'MIT',
      publishExternal: true,
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

    const transaccionFinal = await this.ejecutarTransaccion(async (manager) => {
      const transaccionActualizada = await manager.save(
        Transaccion,
        manager.create(Transaccion, {
          ...transaccionBase,
          estado: estadoFinal,
          rrn: Math.floor(100000 + Math.random() * 900000),
          tipoOperacion: TipoOperacionTransaccionDb.MIT,
          paymentMethodToken: dto.paymentMethodToken,
          mandateId: mandato.id,
          merchantCredentialId: merchantCredential.id,
        }),
      );

      await manager.save(
        DetalleTransaccion,
        manager.create(DetalleTransaccion, {
          transaccion: transaccionActualizada,
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

      await manager.save(
        HistorialTransaccion,
        manager.create(HistorialTransaccion, {
          transaccion: transaccionActualizada,
          statusFrom: EstadoTransaccionDb.PENDIENTE,
          statusTo: estadoFinal,
        }),
      );

      return transaccionActualizada;
    });

    if (estadoFinal === EstadoTransaccionDb.RECHAZADO) {
      await this.publicarEventoTransaccion({
        merchantCredential,
        eventType: 'confirmar_pago',
        transactionId: transaccionFinal.id,
        orderId: dto.idOrden,
        subscriptionId: mandato.id,
        monto: dto.monto,
        moneda: dto.moneda.toUpperCase(),
        tokenTransaccion: cardRecord.id,
        approved: false,
        codigoError: this.errorHelper(bancoRespuesta.message),
        paymentMethodLast4: cardRecord.last4,
        operationType: 'MIT',
        publishExternal: true,
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

    await this.publicarEventoTransaccion({
      merchantCredential,
      eventType: 'confirmar_pago',
      transactionId: transaccionFinal.id,
      orderId: dto.idOrden,
      subscriptionId: mandato.id,
      monto: dto.monto,
      moneda: dto.moneda.toUpperCase(),
      tokenTransaccion: cardRecord.id,
      approved: true,
      codigoError: null,
      paymentMethodLast4: cardRecord.last4,
      operationType: 'MIT',
      publishExternal: true,
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

    await this.publicarEventoTransaccion({
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
      publishExternal: true,
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
      const citTransactionId = randomUUID();
      const transaccionBase = {
        id: citTransactionId,
        monto: payload.monto.toFixed(2),
        moneda: payload.moneda,
        estado: EstadoTransaccionDb.PENDIENTE,
        idOrden: payload.idOrden,
        tipoOperacion: TipoOperacionTransaccionDb.CIT,
        merchantCredentialId: merchantCredential.id,
        paymentMethodToken: null,
        mandateId: null,
      };

      const transaccionFinal = await this.ejecutarTransaccion<Transaccion>(async (manager) => {
        const transaccionActualizada = await manager.save(
          Transaccion,
          manager.create(Transaccion, {
            ...transaccionBase,
            estado: estadoFinal,
            rrn: Math.floor(100000 + Math.random() * 900000),
            tipoOperacion: TipoOperacionTransaccionDb.CIT,
            paymentMethodToken: null,
            mandateId: null,
            merchantCredentialId: merchantCredential.id,
          }),
        );

        await manager.save(
          DetalleTransaccion,
          manager.create(DetalleTransaccion, {
            transaccion: transaccionActualizada,
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

        await manager.save(
          HistorialTransaccion,
          manager.create(HistorialTransaccion, {
            transaccion: transaccionActualizada,
            statusFrom: previousStatus,
            statusTo: estadoFinal,
          }),
        );

        return transaccionActualizada;
      });

      if (estadoFinal === EstadoTransaccionDb.RECHAZADO) {
        await this.publicarEventoTransaccion({
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
          publishExternal: true,
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

      await this.publicarEventoTransaccion({
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
        publishExternal: true,
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

    try {
      await this.rmqService.publish<WebhookJob<TPayload>>('pagos.notificaciones.webhooks', {
        targetUrl: merchantCredential.webhookUrl,
        payload,
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo notificar webhook para ${merchantCredential.id}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async publicarEventoTransaccion(params: {
    merchantCredential: CredencialComercio;
    eventType: 'intento_pago' | 'confirmar_pago';
    transactionId: string;
    orderId: string | null;
    subscriptionId?: string | null;
    monto: number;
    moneda: string;
    tokenTransaccion: string;
    approved: boolean;
    codigoError: string | null;
    paymentMethodLast4: string | null;
    operationType: 'CIT' | 'MIT';
    publishExternal?: boolean;
  }): Promise<void> {
    const timestampEvento = new Date().toISOString();

    const analyticsEvent: AnalyticsTransactionEventEnvelope = {
      source: 'payments',
      event_type: params.eventType,
      payload: {
        transaction_id: params.transactionId,
        order_id: params.orderId,
        merchant_credential_id: params.merchantCredential.id,
        webhook_url: params.merchantCredential.webhookUrl ?? null,
        subscription_id: params.subscriptionId ?? null,
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

    await this.publicarEnRabbitSeguro(TRANSACTION_EVENTS_ANALYTICS_QUEUE, analyticsEvent);

    if (params.publishExternal && params.merchantCredential.webhookUrl) {
      const externalPayload: TransactionWebhookEvent = params.eventType === 'confirmar_pago'
        ? {
            source: 'payments',
            event_type: 'confirmar_pago',
            payload: {
              transaction_id: params.transactionId,
              order_id: params.orderId,
              ...(params.subscriptionId ? { subscription_id: params.subscriptionId } : {}),
              approved: params.approved,
              codigo_error: params.codigoError as TransactionWebhookErrorCode | null,
              token_transaccion: params.tokenTransaccion,
              timestamp_evento: timestampEvento,
            },
          }
        : {
            source: 'payments',
            event_type: 'intento_pago',
            payload: {
              transaction_id: params.transactionId,
              order_id: params.orderId,
              ...(params.subscriptionId ? { subscription_id: params.subscriptionId } : {}),
              monto: params.monto,
              token_transaccion: params.tokenTransaccion,
              timestamp_evento: timestampEvento,
            },
          };

      await this.notificarWebhookComercio(params.merchantCredential, externalPayload);
    }
  }

  private errorHelper(message: string | null): 'insufficient_funds' | 'rejected' {
    if (message && /saldo insuficiente/i.test(message)) {
      return 'insufficient_funds';
    }

    return 'rejected';
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

    await Promise.all([
      this.notificarWebhookComercio(params.merchantCredential, alerta),
      this.publicarEnRabbitSeguro(TRANSACTION_ALERTS_ANALYTICS_QUEUE, alerta),
    ]);
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

  private async ejecutarTransaccion<T>(trabajo: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resultado = await trabajo(queryRunner.manager);
      await queryRunner.commitTransaction();
      return resultado;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
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
  
}
