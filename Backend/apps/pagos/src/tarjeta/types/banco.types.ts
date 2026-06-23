import { EstadoTarjeta } from '../entities/tarjeta.entity';

export enum BancoEstadoOperacion {
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
}

export type BancoTarjetaResumen = {
  id: number;
  numeroMask: string;
  titular: string;
  fechaExpiracion: string;
  dinero: number | null;
  estado: EstadoTarjeta | null;
};

export type BancoAutorizacionResponse = {
  estado: BancoEstadoOperacion;
  message: string;
  montoSolicitado: number;
  saldoDisponible: number | null;
  tarjeta: BancoTarjetaResumen;
};