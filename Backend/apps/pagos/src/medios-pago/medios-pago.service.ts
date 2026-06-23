import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { MandatoPago, EstadoMandatoPagoDb } from './entities/mandato-pago.entity';
import { EstadoTarjetaGuardadaDb, TarjetaGuardada } from './entities/tarjeta-guardada.entity';
import { CredencialComercio, EstadoCredencialComercioDb } from '../comercios/entities/credencial-comercio.entity';
import { TokenizarMitDto } from './dto/token-mit.dto';
import { EstadoRespuestaTransaccion } from '../pago/enums/estado-respuesta-transaccion.enum';

export type CardInput = {
  userId: string;
  numero: string;
  exp_mes: number | string;
  exp_ano: number | string;
  cvc: string;
  holder_name?: string;
};

export interface TokenizeMitResult {
  status: EstadoRespuestaTransaccion;
  message: string;
  paymentMethodToken: string;
  mandateId: string;
  card: {
    brand: string | null;
    last4: string;
    expMonth: number;
    expYear: number;
    holderName: string | null;
  };
}

export interface ResponseBase {
  status: EstadoRespuestaTransaccion;
  message: string;
}

@Injectable()
export class MediosPagoService {
  constructor(
    @InjectRepository(TarjetaGuardada)
    private readonly tarjetaGuardadaRepository: Repository<TarjetaGuardada>,
    @InjectRepository(MandatoPago)
    private readonly mandatoPagoRepository: Repository<MandatoPago>,
    @InjectRepository(CredencialComercio)
    private readonly credencialComercioRepository: Repository<CredencialComercio>,
  ) {}

  async guardarTarjeta(card: CardInput, holderName?: string) {
    const numeroPan = card.numero;
    const tarjetaExistente = await this.tarjetaGuardadaRepository.findOne({
      where: {
        userId: card.userId,
        numeroPan,
        estado: EstadoTarjetaGuardadaDb.ACTIVA,
      },
    });

    if (tarjetaExistente) {
      throw new ConflictException('La tarjeta ya está guardada para este usuario');
    }

    const tarjeta = this.tarjetaGuardadaRepository.create({
      userId: card.userId,
      numeroPan,
      expMonth: Number(card.exp_mes),
      expYear: Number(card.exp_ano),
      last4: numeroPan.slice(-4),
      brand: this.detectarMarca(numeroPan),
      holderName: holderName ?? card.holder_name ?? null,
      fingerprint: this.generarFingerprint(numeroPan, card.exp_mes, card.exp_ano),
      estado: EstadoTarjetaGuardadaDb.ACTIVA,
    });

    return this.tarjetaGuardadaRepository.save(tarjeta);
  }

  async buscarTarjetaPorToken(token: string) {
    return this.tarjetaGuardadaRepository.findOne({ where: { id: token } });
  }

  async findByUserId(userId: string) {
    return this.tarjetaGuardadaRepository.find({
      where: {
        userId,
        estado: EstadoTarjetaGuardadaDb.ACTIVA,
      },
      select: {
        id: true,
        last4: true,
        brand: true,
        expMonth: true,
        expYear: true,
        holderName: true,
      }
    });
  }

  async crearMandato(data: {
    merchantCredentialId: string;
    paymentMethodToken: string;
    initialTransactionId?: string | null;
    currency?: string;
    recurrenceType?: string | null;
    amountLimit?: string | null;
  }) {
    const mandato = this.mandatoPagoRepository.create({
      merchantCredentialId: data.merchantCredentialId,
      paymentMethodToken: data.paymentMethodToken,
      initialTransactionId: data.initialTransactionId ?? null,
      currency: data.currency ?? 'CLP',
      recurrenceType: data.recurrenceType ?? null,
      amountLimit: data.amountLimit ?? null,
      estado: EstadoMandatoPagoDb.ACTIVO,
    });

    return this.mandatoPagoRepository.save(mandato);
  }

  async buscarMandatoPorTarjetaYComercio(paymentMethodToken: string, merchantCredentialId: string) {
    return this.mandatoPagoRepository.findOne({
      where: {
        paymentMethodToken,
        merchantCredentialId,
        estado: EstadoMandatoPagoDb.ACTIVO,
      },
    });
  }

  private detectarMarca(numeroPan: string) {
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

  private generarFingerprint(numeroPan: string, expMonth: number | string, expYear: number | string) {
    return createHash('sha256').update(`${numeroPan}:${expMonth}:${expYear}`).digest('hex');
  }

  async tokenizeMitCard(dto: TokenizarMitDto, merchantCredentialId: string): Promise<TokenizeMitResult> {
    const merchantCredential = await this.resolveMerchantCredential(merchantCredentialId);
    const cardRecord = await this.guardarTarjeta({ ...dto.tarjeta, userId: dto.userId }, dto.titular);

    const mandato = await this.crearMandato({
      merchantCredentialId: merchantCredential.id,
      paymentMethodToken: cardRecord.id,
      currency: 'CLP',
    });

    return {
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Tarjeta guardada correctamente',
      paymentMethodToken: cardRecord.id,
      mandateId: mandato.id,
      card: {
        brand: cardRecord.brand,
        last4: cardRecord.last4,
        expMonth: cardRecord.expMonth,
        expYear: cardRecord.expYear,
        holderName: cardRecord.holderName,
      },
    };
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

  async eliminarTarjetaGuardada(userId: string, tarjetaId: string): Promise<ResponseBase> {
    const tarjeta = await this.tarjetaGuardadaRepository.findOne({
      where: {
        id: tarjetaId,
        userId,
        estado: EstadoTarjetaGuardadaDb.ACTIVA,
      },
    });

    if (!tarjeta) {
      throw new NotFoundException('Tarjeta guardada no encontrada');
    }

    tarjeta.estado = EstadoTarjetaGuardadaDb.ELIMINADA;
    await this.tarjetaGuardadaRepository.save(tarjeta);
    return {
      status: EstadoRespuestaTransaccion.APROBADO,
      message: 'Tarjeta eliminada correctamente',
    };
  }
}