import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsTransactionEvent,
  CONCILIATION_ALERTS_ANALYTICS_QUEUE,
  TRANSACTION_ALERTS_ANALYTICS_QUEUE,
  TRANSACTION_EVENTS_ANALYTICS_QUEUE,
  TransactionAlert,
  ConciliationAlert,
  WebhookJob,
  RabbitMqService,
} from '@app/rmq';
import { AlertaHistorica, ErrorAlertaHistorica, TipoAlertaHistorica } from './entities/alerta-historica.entity';

type RetryTrackingItem = {
  transactionId: string;
  webhookUrl: string | null;
};

type StoredTransactionRetryAlertPayload = {
  ultimos_4: number;
  cantidad: number;
  transacciones: string[];
};

type StoredTransactionAmountMismatchPayload = {
  id_transaccion: string | null;
  monto_original: number;
  monto_cobrado: number;
};

type StoredConciliationAlertPayload = {
  id_transaccion: string | null;
  rrn: number | null;
  id_archivo: string | null;
};

type AlertaHistoricaResumen = {
  id: string;
  fecha: string;
  tipo: 'Transacción' | 'Conciliación';
  descripcion: string;
  nivel: 'Alto' | 'Medio' | 'Bajo';
  revisado: boolean;
};

@Injectable()
export class AnaliticaService implements OnModuleInit {
  private readonly logger = new Logger(AnaliticaService.name);
  private readonly retryTrackingByCard = new Map<string, RetryTrackingItem[]>();

  constructor(
    private readonly rmqService: RabbitMqService,
    @InjectRepository(AlertaHistorica)
    private readonly alertaHistoricaRepository: Repository<AlertaHistorica>,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.rmqService.consume<AnalyticsTransactionEvent>(TRANSACTION_EVENTS_ANALYTICS_QUEUE, async (payload) => {
        await this.registrarEventoTransaccion(payload);
      }),
      this.rmqService.consume<TransactionAlert>(TRANSACTION_ALERTS_ANALYTICS_QUEUE, async (payload) => {
        await this.registrarAlertaTransaccion(payload);
      }),
      this.rmqService.consume<ConciliationAlert>(CONCILIATION_ALERTS_ANALYTICS_QUEUE, async (payload) => {
        await this.registrarAlertaConciliacion(payload);
      }),
    ]);
  }

  async obtenerAlertasHistoricas(revisado?: boolean): Promise<AlertaHistoricaResumen[]> {
    const alertas = await this.alertaHistoricaRepository.find({
      where: revisado === undefined ? {} : { revisado },
      order: { createdAt: 'DESC' },
    });

    return alertas.map((alerta) => this.formatearAlertaHistorica(alerta));
  }

  async marcarAlertaComoRevisada(id: string): Promise<AlertaHistoricaResumen> {
    const alerta = await this.alertaHistoricaRepository.findOne({ where: { id } });

    if (!alerta) {
      throw new NotFoundException('Alerta histórica no encontrada');
    }

    alerta.revisado = true;
    const guardada = await this.alertaHistoricaRepository.save(alerta);

    return this.formatearAlertaHistorica(guardada);
  }

  private async registrarEventoTransaccion(evento: AnalyticsTransactionEvent): Promise<void> {
    if (evento.event_type !== 'confirmar_pago' || evento.payload.approved !== false || evento.payload.codigo_error === 'NO_MANDATE') {
      return;
    }

    const merchantCredentialId = evento.payload.merchant_credential_id;
    const paymentMethodLast4 = evento.payload.payment_method_last4;
    const transactionId = evento.payload.transaction_id;

    if (!merchantCredentialId || !paymentMethodLast4 || !transactionId) {
      return;
    }

    const retryKey = this.obtenerRetryKey(merchantCredentialId, paymentMethodLast4);
    const history = [...(this.retryTrackingByCard.get(retryKey) ?? []), { transactionId, webhookUrl: evento.payload.webhook_url }].slice(-4);
    this.retryTrackingByCard.set(retryKey, history);

    if (history.length < 4) {
      return;
    }

    await this.detectarReintentos({
      paymentMethodLast4,
      webhookUrl: evento.payload.webhook_url,
      transacciones: history.map((item) => item.transactionId),
    });
  }

  private async registrarAlertaTransaccion(alerta: TransactionAlert): Promise<void> {
    await this.alertaHistoricaRepository.save(
      this.alertaHistoricaRepository.create({
        tipo: TipoAlertaHistorica.TRANSACCION,
        error: alerta.payload.error as ErrorAlertaHistorica,
        payload: this.construirPayloadAlertaTransaccion(alerta.payload),
        revisado: false,
      }),
    );
  }

  private async registrarAlertaConciliacion(alerta: ConciliationAlert): Promise<void> {
    await this.alertaHistoricaRepository.save(
      this.alertaHistoricaRepository.create({
        tipo: TipoAlertaHistorica.CONCILIACION,
        error: alerta.payload.tipo_discrepancia as ErrorAlertaHistorica,
        payload: this.construirPayloadAlertaConciliacion(alerta.payload),
        revisado: false,
      }),
    );
  }

  private async detectarReintentos(params: {
    paymentMethodLast4: string;
    webhookUrl: string | null;
    transacciones: string[];
  }): Promise<void> {
    const transacciones = params.transacciones.slice(-4);

    const alertaRetry = this.alertaHistoricaRepository.create({
      tipo: TipoAlertaHistorica.TRANSACCION,
      error: ErrorAlertaHistorica.RETRY_WARNING,
      revisado: false,
      payload: {
        ultimos_4: Number.parseInt(params.paymentMethodLast4, 10),
        cantidad: transacciones.length,
        transacciones,
      } satisfies StoredTransactionRetryAlertPayload,
    });

    await this.alertaHistoricaRepository.save(alertaRetry);

    if (params.webhookUrl) {
      await this.rmqService.publish<WebhookJob<TransactionAlert>>('pagos.notificaciones.webhooks', {
        targetUrl: params.webhookUrl,
        payload: alertaRetry.payload as unknown as TransactionAlert,
      });
    }
  }

  private obtenerRetryKey(merchantCredentialId: string, paymentMethodLast4: string): string {
    return `${merchantCredentialId}:${paymentMethodLast4}`;
  }

  private construirPayloadAlertaTransaccion(
    payload: TransactionAlert['payload'],
  ): StoredTransactionAmountMismatchPayload | StoredTransactionRetryAlertPayload {
    if (payload.error === ErrorAlertaHistorica.NOT_EQUAL) {
      return {
        id_transaccion: payload.id_transaccion,
        monto_original: payload.monto_original,
        monto_cobrado: payload.monto_cobrado,
      };
    }

    return {
      ultimos_4: payload.ultimos_4,
      cantidad: payload.cantidad,
      transacciones: payload.transacciones,
    };
  }

  private construirPayloadAlertaConciliacion(
    payload: ConciliationAlert['payload'],
  ): StoredConciliationAlertPayload {
    return {
      id_transaccion: payload.id_transaccion,
      rrn: payload.rrn,
      id_archivo: payload.id_archivo,
    };
  }

  private formatearAlertaHistorica(alerta: AlertaHistorica): AlertaHistoricaResumen {
    const fechaBase = alerta.eventCreatedAt ?? alerta.createdAt;

    return {
      id: alerta.id,
      fecha: this.formatearFecha(fechaBase),
      tipo: alerta.tipo === TipoAlertaHistorica.TRANSACCION ? 'Transacción' : 'Conciliación',
      descripcion: this.construirDescripcionAlerta(alerta),
      nivel: this.nivelAlerta(alerta),
      revisado: alerta.revisado,
    };
  }

  private nivelAlerta(alerta: AlertaHistorica): 'Alto' | 'Medio' | 'Bajo' {
    if (alerta.tipo === TipoAlertaHistorica.TRANSACCION && alerta.error === ErrorAlertaHistorica.RETRY_WARNING) {
      return 'Medio';
    }

    if (alerta.tipo === TipoAlertaHistorica.CONCILIACION && alerta.error === ErrorAlertaHistorica.DIFERENCIA_DE_MONTO) {
      return 'Medio';
    }

    return 'Alto';
  }

  private construirDescripcionAlerta(alerta: AlertaHistorica): string {
    const payload = alerta.payload as Record<string, unknown>;

    if (alerta.tipo === TipoAlertaHistorica.TRANSACCION) {
      if (alerta.error === ErrorAlertaHistorica.NOT_EQUAL) {
        return `Monto original $${payload.monto_original ?? 0} y cobrado $${payload.monto_cobrado ?? 0}.`;
      }

      const transacciones = Array.isArray(payload.transacciones) ? payload.transacciones.length : 0;
      return `Se detectaron ${payload.cantidad ?? transacciones} intentos fallidos con la tarjeta terminada en ${String(payload.ultimos_4 ?? '')}.`;
    }

    if (alerta.error === ErrorAlertaHistorica.DIFERENCIA_DE_MONTO) {
      return `Diferencia de monto entre sistema interno y banco para la transacción ${String(payload.id_transaccion ?? 'sin-id')}.`;
    }

    if (alerta.error === ErrorAlertaHistorica.EXISTE_EN_BANCO) {
      return `La transacción ${String(payload.id_transaccion ?? 'sin-id')} existe en el banco y no en el sistema interno.`;
    }

    return `La transacción ${String(payload.id_transaccion ?? 'sin-id')} no fue encontrada en el banco.`;
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toISOString().replace('T', ' ').slice(0, 16);
  }
}
