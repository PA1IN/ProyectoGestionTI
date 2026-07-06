import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
      }),
    );
  }

  private async registrarAlertaConciliacion(alerta: ConciliationAlert): Promise<void> {
    await this.alertaHistoricaRepository.save(
      this.alertaHistoricaRepository.create({
        tipo: TipoAlertaHistorica.CONCILIACION,
        error: alerta.payload.tipo_discrepancia as ErrorAlertaHistorica,
        payload: this.construirPayloadAlertaConciliacion(alerta.payload),
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
}
