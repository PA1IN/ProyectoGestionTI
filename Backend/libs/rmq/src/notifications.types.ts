export const TRANSACTION_WEBHOOK_QUEUE = 'pagos.notificaciones.webhooks';
export const TRANSACTION_ALERTS_ANALYTICS_QUEUE = 'analitica.alertas.transacciones';

export type WebhookJob<TPayload> = {
  targetUrl: string;
  payload: TPayload;
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