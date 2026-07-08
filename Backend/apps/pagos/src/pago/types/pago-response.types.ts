import { EstadoRespuestaTransaccion } from '../enums/estado-respuesta-transaccion.enum';
import { TipoPagoDb } from '../entities/detalle-transaccion.entity';
import { TipoOperacionTransaccionDb } from '../enums/transaccion.enum';

export type PaymentCardSummary = {
  paymentMethodToken: string;
  brand: string | null;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string | null;
};

export type TransactionCardSummary = Pick<PaymentCardSummary, 'brand' | 'last4' | 'expMonth' | 'expYear'>;

export type TransactionDetails = {
  monto: number;
  moneda: string;
  nombreComercio: string;
};

export type TransactionPaymentInfo = {
  status: EstadoRespuestaTransaccion;
  paymentType: TipoPagoDb | null;
  amount: number;
  currency: string;
  operationType: TipoOperacionTransaccionDb | null;
  rrn: number | null;
  authorizationCode: string | null;
  cardIssuer: string | null;
  last4Digits: string | null;
  installments: number | null;
};

export type TransactionInfoResult = {
  transactionId: string;
  orderId: string;
  paymentInfo: TransactionPaymentInfo;
};

export type TransactionResponseBase = {
  status: EstadoRespuestaTransaccion;
  message: string;
  transactionId: string;
};

export type CreateTransactionResult = {
  token: string;
  transactionUrl: string;
  transactionId: string;
  tokenType: 'Bearer';
  expiresIn: string;
};

export type CheckoutQrResult = TransactionResponseBase & {
  qrData: string;
  codigoQr: string;
  returnUrl: string;
};

export type CheckoutDetail = {
  token: string;
  comercio: string;
  montoTotal: number;
  moneda: string;
  returnUrl: string;
  estado: EstadoRespuestaTransaccion;
  tarjeta: {
    marca: string | null;
    ultimosCuatro: string | null;
    expMonth?: number | null;
    expYear?: number | null;
  } | null;
  rrn?: number | null;
  tipoOperacion?: 'CIT' | 'MIT' | null;
  codigoAutorizacion?: string | null;
};

export type ProcessTransactionResult = TransactionResponseBase & {
  redirectUrl: string;
  details?: TransactionDetails;
};

export type MitPaymentResult = TransactionResponseBase & {
  paymentMethodToken: string;
  mandateId: string | null;
  card: TransactionCardSummary;
  customer?: string;
  description?: string;
};

export type WebhookCardSummary = {
  brand: string | null;
  last4: string | null;
  expMonth?: number | null;
  expYear?: number | null;
};

export type TransactionWebhookPayload = {
  event: 'transaction.approved' | 'transaction.rejected';
  transactionId: string;
  idOrden: string;
  operationType: 'CIT' | 'MIT';
  status: EstadoRespuestaTransaccion.APROBADO | EstadoRespuestaTransaccion.RECHAZADO;
  monto: number;
  moneda: string;
  mandateId?: string | null;
  paymentMethodToken?: string | null;
  customer?: string;
  card?: WebhookCardSummary | null;
  timestamp: string;
};