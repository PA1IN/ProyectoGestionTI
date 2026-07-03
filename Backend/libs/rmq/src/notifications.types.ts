export const TRANSACTION_WEBHOOK_QUEUE = 'pagos.notificaciones.webhooks';
export const TRANSACTION_EVENTS_ANALYTICS_QUEUE = 'analitica.eventos.transacciones';
export const TRANSACTION_ALERTS_ANALYTICS_QUEUE = 'analitica.alertas.transacciones';
export const CONCILIATION_ALERTS_ANALYTICS_QUEUE = 'analitica.alertas.conciliacion';

export type WebhookJob<TPayload> = {
  targetUrl: string;
  payload: TPayload;
};

export type PaymentSource = 'payments';

export type TransactionIntentEventPayload = {
  transaction_id: string;
  order_id: string | null;
  subscription_id?: string | null;
  monto: number;
  token_transaccion: string;
  timestamp_evento: string;
};

export type TransactionWebhookErrorCode = 'insufficient_funds' | 'rejected';

export type TransactionConfirmEventPayload = {
  transaction_id: string;
  order_id: string | null;
  subscription_id?: string | null;
  approved: boolean;
  codigo_error: TransactionWebhookErrorCode | null;
  token_transaccion: string;
  timestamp_evento: string;
};

export type TransactionWebhookEvent = {
  source: PaymentSource;
  event_type: 'intento_pago' | 'confirmar_pago';
  payload: TransactionIntentEventPayload | TransactionConfirmEventPayload;
};

export type AnalyticsTransactionEventPayload = {
  transaction_id: string;
  order_id: string | null;
  merchant_credential_id: string;
  webhook_url: string | null;
  subscription_id?: string | null;
  monto: number;
  moneda: string;
  token_transaccion: string;
  payment_method_last4: string | null;
  approved: boolean;
  codigo_error: string | null;
  operation_type: 'CIT' | 'MIT';
  timestamp_evento: string;
};

export type AnalyticsTransactionEventEnvelope = {
  source: PaymentSource;
  event_type: 'intento_pago' | 'confirmar_pago';
  payload: AnalyticsTransactionEventPayload;
};

export type TransactionAmountMismatchAlert = {
  tipo: 'Transaccion';
  error: 'NOT_EQUAL';
  id_transaccion: string | null;
  monto_original: number;
  monto_cobrado: number;
};

export type TransactionRetryWarningAlert = {
  tipo: 'Transaccion';
  error: 'RETRY_WARNING';
  merchant_credential_id: string;
  webhook_url: string | null;
  ultimos_4: number;
  cantidad: number;
  transacciones: string[];
};

export type TransactionAlertPayload = TransactionAmountMismatchAlert | TransactionRetryWarningAlert;

export type TransactionAlertEnvelope = {
  sistema_id: string;
  creado_en: string;
  payload: TransactionAlertPayload;
};

export type ConciliationAlertPayload =
  | {
      tipo: 'Conciliacion';
      tipo_discrepancia: 'EXISTE_EN_BANCO';
      rrn: number | null;
      id_transaccion: string | null;
      id_archivo: string | null;
    }
  | {
      tipo: 'Conciliacion';
      tipo_discrepancia: 'FALTANTE_EN_BANCO';
      rrn: number | null;
      id_transaccion: string | null;
      id_archivo: string | null;
    }
  | {
      tipo: 'Conciliacion';
      tipo_discrepancia: 'DIFERENCIA_DE_MONTO';
      rrn: number | null;
      id_transaccion: string | null;
      id_archivo: string | null;
      monto_interno: number | null;
      monto_banco: number | null;
    };

export type ConciliationAlertEnvelope = {
  sistema_id: string;
  creado_en: string;
  payload: ConciliationAlertPayload;
};