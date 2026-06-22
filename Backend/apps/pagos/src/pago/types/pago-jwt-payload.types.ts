export type TransactionPayload = {
  transactionId: string;
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  tipo: 'transaccion-init';
  iatAt: string;
};

export type CheckoutPayload = {
  transactionId: string;
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  tipo: 'transaccion-init';
  iatAt: string;
};