import { EstadoRespuestaTransaccion } from '../enums/estado-respuesta-transaccion.enum';

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

export type CheckoutDetail = {
  token: string;
  comercio: string;
  montoTotal: number;
  estado: EstadoRespuestaTransaccion;
  urlRetorno: string;
  //codigoQr: string;
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