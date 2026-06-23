import { ConflictException, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { CreateTransaccionDto } from './dto/create-transaccion.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckoutDto } from './dto/checkout.dto';
import { MitDto } from './dto/mit.dto';
import { TokenizarMitDto } from './dto/token-mit.dto';
import { EstadoRespuestaTransaccion } from './enums/estado-respuesta-transaccion.enum';
import { EstadoTransaccionDb, TipoOperacionTransaccionDb, Transaccion } from './entities/transaccion.entity';
import { HistorialTransaccion } from './entities/historial-transaccion.entity';
import { DetalleTransaccion, TipoPagoDb } from './entities/detalle-transaccion.entity';
import { MediosPagoService } from '../medios-pago/medios-pago.service';
import { TarjetaService } from '../tarjeta/tarjeta.service';
import { TarjetaGuardada } from '../medios-pago/entities/tarjeta-guardada.entity';
import { MandatoPago } from '../medios-pago/entities/mandato-pago.entity';
import { CredencialComercio, EstadoCredencialComercioDb } from '../comercios/entities/credencial-comercio.entity';
import { CheckoutDetail, CreateTransactionResult, MitPaymentResult, PaymentCardSummary, ProcessTransactionResult, TokenizeMitResult } from './types/pago-response.types';
import { CheckoutPayload, TransactionPayload } from './types/pago-jwt-payload.types';
import { BancoEstadoOperacion } from '../tarjeta/types/banco.types';

@Injectable()
export class PagoService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mediosPagoService: MediosPagoService,
    private readonly tarjetaService: TarjetaService,

    @InjectRepository(CredencialComercio)
    private readonly credencialComercioRepository: Repository<CredencialComercio>,
    @InjectRepository(Transaccion)
    private readonly transaccionRepository: Repository<Transaccion>,
    @InjectRepository(HistorialTransaccion)
    private readonly historialRepository: Repository<HistorialTransaccion>,
    @InjectRepository(DetalleTransaccion)
    private readonly detalleRepository: Repository<DetalleTransaccion>,
  ) {}

  async tokenizeMitCard(dto: TokenizarMitDto, merchantCredentialId: string): Promise<TokenizeMitResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const cardRecord = await this.mediosPagoService.guardarTarjeta(dto.card, dto.titular ?? dto.holderName);

    const mandato = await this.mediosPagoService.crearMandato({
      merchantCredentialId: merchantCredential.id,
      paymentMethodToken: cardRecord.id,
      currency: 'CLP',
    });

    return {
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Tarjeta tokenizada correctamente',
      paymentMethodToken: cardRecord.id,
      mandateId: mandato.id,
      card: {
        paymentMethodToken: cardRecord.id,
        brand: cardRecord.brand,
        last4: cardRecord.last4,
        expMonth: cardRecord.expMonth,
        expYear: cardRecord.expYear,
        holderName: cardRecord.holderName,
      },
    };
  }

  async processMitPayment(dto: MitDto, merchantCredentialId: string): Promise<MitPaymentResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const cardRecord = await this.mediosPagoService.buscarTarjetaPorToken(dto.paymentMethodToken);

    if (!cardRecord) {
      throw new NotFoundException('Medio de pago no encontrado');
    }

    const mandato = await this.mediosPagoService.buscarMandatoPorTarjetaYComercio(dto.paymentMethodToken, merchantCredential.id);

    if (!mandato) {
      const transaccionRechazada = await this.transaccionRepository.save(
        this.transaccionRepository.create({
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

      await this.historialRepository.save(
        this.historialRepository.create({
          transaccion: transaccionRechazada,
          statusFrom: EstadoTransaccionDb.PENDIENTE,
          statusTo: EstadoTransaccionDb.RECHAZADO,
        }),
      );

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
          message: existingStatus === EstadoRespuestaTransaccion.APROBADO ? 'MIT procesado correctamente' : 'MIT ya fue rechazado',
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

    const bancoRespuesta = await this.tarjetaService.autorizarBanco({
      numero: cardRecord.numeroPan,
      titular: cardRecord.holderName ?? dto.customer ?? 'ANONIMO',
      fechaExpiracion: `${String(cardRecord.expMonth).padStart(2, '0')}/${String(cardRecord.expYear).slice(-2)}`,
      monto: dto.monto,
    });

    if (bancoRespuesta.estado === BancoEstadoOperacion.RECHAZADA) {
      return {
        status: EstadoRespuestaTransaccion.RECHAZADO,
        message: bancoRespuesta.message,
        transactionId: 'unknown',
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

    const transaccion = await this.transaccionRepository.save(
      this.transaccionRepository.create({
        monto: dto.monto.toFixed(2),
        moneda: dto.moneda.toUpperCase(),
        estado: EstadoTransaccionDb.PENDIENTE,
        idOrden: dto.idOrden,
        tipoOperacion: TipoOperacionTransaccionDb.MIT,
        merchantCredentialId: merchantCredential.id,
        paymentMethodToken: dto.paymentMethodToken,
        mandateId: mandato.id,
      }),
    );

    transaccion.estado = EstadoTransaccionDb.APROBADO;
    transaccion.rrn = Math.floor(100000 + Math.random() * 900000);
    await this.transaccionRepository.save(transaccion);

    await this.detalleRepository.save(
      this.detalleRepository.create({
        transaccion,
        nombreUsuario: dto.customer ?? 'MIT',
        rut: '',
        tipoPago: TipoPagoDb.TARJETA,
        ultimosCuatro: cardRecord.last4,
        cuotas: 1,
        codigoAutorizacion: `auth_${Math.random().toString(36).slice(2, 8)}`,
        emisorTarjeta: cardRecord.brand ?? 'UNKNOWN',
        paymentMethodToken: dto.paymentMethodToken,
      }),
    );

    await this.historialRepository.save(
      this.historialRepository.create({
        transaccion,
        statusFrom: EstadoTransaccionDb.PENDIENTE,
        statusTo: EstadoTransaccionDb.APROBADO,
      }),
    );

    return {
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'MIT procesado correctamente',
      transactionId: transaccion.id,
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
        existingTransaction.merchantCredentialId !== merchantCredentialId
      ) {
        throw new ConflictException('El id de orden ya fue utilizado con otra solicitud');
      }

      const existingPayload: TransactionPayload = {
        transactionId: existingTransaction.id,
        idOrden: existingTransaction.idOrden,
        monto: createTransaccionDto.monto,
        moneda: createTransaccionDto.moneda,
        nombreComercio: createTransaccionDto.nombreComercio,
        returnUrl: createTransaccionDto.returnUrl,
        tipo: 'transaccion-init',
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

    const transaccion = await this.transaccionRepository.save(
      this.transaccionRepository.create({
        monto: createTransaccionDto.monto.toFixed(2),
        moneda: createTransaccionDto.moneda,
        estado: EstadoTransaccionDb.PENDIENTE,
        idOrden: createTransaccionDto.idOrden,
        tipoOperacion: TipoOperacionTransaccionDb.CIT,
        merchantCredentialId: merchantCredentialId,
      }),
    );

    const payload: TransactionPayload = {
      transactionId: transaccion.id,
      idOrden: transaccion.idOrden,
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

  async getCheckoutTransaccion(token: string): Promise<CheckoutDetail> {
    try {
      const payload = await this.jwtService.verifyAsync<CheckoutPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const transaccion = await this.transaccionRepository.findOne({
        where: { id: payload.transactionId },
      });

      const estado = !transaccion
        ? 'pendiente'
        : transaccion.estado === EstadoTransaccionDb.APROBADO
          ? 'aprobada'
          : transaccion.estado === EstadoTransaccionDb.RECHAZADO || transaccion.estado === EstadoTransaccionDb.FALLIDO
            ? 'rechazada'
            : 'pendiente';

      return {
        token,
        comercio: payload.nombreComercio,
        montoTotal: payload.monto,
        estado,
        urlRetorno: payload.returnUrl,
        codigoQr: `bancoapp://pay?transactionId=${payload.transactionId}&amount=${payload.monto}&currency=${payload.moneda}`,
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
      if (checkoutDto.idOrden !== payload.idOrden || checkoutDto.idOrden !== transaccion.idOrden) {
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

      const bancoRespuesta = await this.tarjetaService.autorizarBanco({
        numero: checkoutDto.numeroTarjeta,
        titular: checkoutDto.titular ?? 'ANONIMO',
        fechaExpiracion: checkoutDto.fechaExpiracion,
        cvv: checkoutDto.cvv,
        monto: payload.monto,
      });

      if (bancoRespuesta.estado === BancoEstadoOperacion.RECHAZADA) {
        transaccion.estado = EstadoTransaccionDb.RECHAZADO;
        transaccion.rrn = Math.floor(100000 + Math.random() * 900000);
        await this.transaccionRepository.save(transaccion);

        await this.historialRepository.save(
          this.historialRepository.create({
            transaccion,
            statusFrom: previousStatus,
            statusTo: EstadoTransaccionDb.RECHAZADO,
          }),
        );

        return {
          status: EstadoRespuestaTransaccion.RECHAZADO,
          message: bancoRespuesta.message,
          redirectUrl: `${payload.returnUrl}?status=RECHAZADO&transactionId=${transaccion.id}`,
          transactionId: transaccion.id,
          details: {
            monto: payload.monto,
            moneda: payload.moneda,
            nombreComercio: payload.nombreComercio,
          },
        };
      }

      const status = EstadoRespuestaTransaccion.APROBADO;
      const last4 = checkoutDto.numeroTarjeta.slice(-4);
      const brand = this.detectarMarcaTarjeta(checkoutDto.numeroTarjeta);

      await this.detalleRepository.save(
        this.detalleRepository.create({
          transaccion,
          nombreUsuario: checkoutDto.titular ?? 'ANONIMO',
          rut: '',
          tipoPago: TipoPagoDb.TARJETA,
          ultimosCuatro: last4,
          cuotas: status === EstadoRespuestaTransaccion.APROBADO ? 1 : 0,
          codigoAutorizacion: `auth_${Math.random().toString(36).slice(2, 8)}`,
          emisorTarjeta: brand,
          paymentMethodToken: null,
        }),
      );

      transaccion.estado = status === EstadoRespuestaTransaccion.APROBADO ? EstadoTransaccionDb.APROBADO : EstadoTransaccionDb.RECHAZADO;
      transaccion.rrn = Math.floor(100000 + Math.random() * 900000);
      transaccion.tipoOperacion = TipoOperacionTransaccionDb.CIT;
      transaccion.paymentMethodToken = null;
      transaccion.mandateId = null;
      transaccion.merchantCredentialId = merchantCredential.id;
      await this.transaccionRepository.save(transaccion);

      await this.historialRepository.save(
        this.historialRepository.create({
          transaccion,
          statusFrom: previousStatus,
          statusTo: status === EstadoRespuestaTransaccion.APROBADO ? EstadoTransaccionDb.APROBADO : EstadoTransaccionDb.RECHAZADO,
        }),
      );

      const isApproved = status === EstadoRespuestaTransaccion.APROBADO;
      const transactionId = transaccion.id;

      return {
        status,
        message: isApproved ? 'Transacción aprobada' : 'Transacción rechazada',
        redirectUrl: `${payload.returnUrl}?status=${status}&transactionId=${transactionId}`,
        transactionId,
        details: {
          monto: payload.monto,
          moneda: payload.moneda,
          nombreComercio: payload.nombreComercio,
        },
      };
    } catch (error) {
      Logger.error('Error al procesar la transacción', error);
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

  private detectarMarcaTarjeta(numeroPan: string) {
    if (/^4/.test(numeroPan)) {
      return 'VISA';
    }

    if (/^5[1-5]/.test(numeroPan)) {
      return 'MASTERCARD';
    }

    if (/^3[47]/.test(numeroPan)) {
      return 'AMEX';
    }

    return 'UNKNOWN';
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
