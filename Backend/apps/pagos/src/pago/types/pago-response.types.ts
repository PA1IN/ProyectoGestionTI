import { EstadoRespuestaTransaccion } from '../enums/estado-respuesta-transaccion.enum';

export type PaymentCardSummary = {
  paymentMethodToken: string;
  brand: string | null;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string | null;
};

export type ProcessTransactionResult = {
  status: EstadoRespuestaTransaccion;
  message: string;
  redirectUrl: string;
  transactionId: string;
  details?: {
    monto: number;
    moneda: string;
    nombreComercio: string;
  };
};

export type CheckoutDetail = {
  token: string;
  comercio: string;
  montoTotal: number;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  urlRetorno: string;
  codigoQr: string;
};

export type TokenizeMitResult = {
  status: EstadoRespuestaTransaccion;
  message: string;
  paymentMethodToken: string;
  mandateId: string;
  card: PaymentCardSummary;
};

export type MitPaymentResult = {
  status: EstadoRespuestaTransaccion;
  message: string;
  transactionId: string;
  paymentMethodToken: string;
  mandateId: string | null;
  card: Pick<PaymentCardSummary, 'brand' | 'last4' | 'expMonth' | 'expYear'>;
  customer?: string;
  description?: string;
};