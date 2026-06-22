import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { MandatoPago, EstadoMandatoPagoDb } from './entities/mandato-pago.entity';
import { EstadoTarjetaGuardadaDb, TarjetaGuardada } from './entities/tarjeta-guardada.entity';

export type CardInput = {
  numero: string;
  exp_mes: number | string;
  exp_ano: number | string;
  cvc: string;
  holder_name?: string;
};

@Injectable()
export class MediosPagoService {
  constructor(
    @InjectRepository(TarjetaGuardada)
    private readonly tarjetaGuardadaRepository: Repository<TarjetaGuardada>,
    @InjectRepository(MandatoPago)
    private readonly mandatoPagoRepository: Repository<MandatoPago>,
  ) {}

  async guardarTarjeta(card: CardInput, holderName?: string) {
    const numeroPan = card.numero;
    const tarjeta = this.tarjetaGuardadaRepository.create({
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
}