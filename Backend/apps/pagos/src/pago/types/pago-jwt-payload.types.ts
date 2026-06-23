export type TransactionPayload = {
  transactionId: string;
  idOrden: string;
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  iatAt: string;
};

export type CheckoutPayload = {
  transactionId: string;
  idOrden: string;
  monto: number;
  moneda: string;
  nombreComercio: string;
  returnUrl: string;
  iatAt: string;
};