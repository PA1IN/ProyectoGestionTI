import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Transaccion } from './transaccion.entity';

export enum TipoPagoDb {
  TARJETA = 'TARJETA',
  BILLETERA = 'BILLETERA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  QR = 'QR',
}

@Entity({ name: 'detalle_transaccion' })
export class DetalleTransaccion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nombre_usuario', type: 'varchar' })
  nombreUsuario!: string;

  @Column({ type: 'varchar' })
  rut!: string;

  @ManyToOne(() => Transaccion, (transaccion: Transaccion) => transaccion.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_transaccion' })
  transaccion!: Transaccion;

  @Column({ name: 'metodo_pago', type: 'enum', enum: TipoPagoDb, enumName: 'tipo_pago' })
  tipoPago!: TipoPagoDb;

  @Column({ name: 'ultimos_cuatro', type: 'varchar', length: 4, nullable: true })
  ultimosCuatro!: string | null;

  @Column({ nullable: true, type: 'int' })
  cuotas!: number;

  @Column({ name: 'codigo_autorizacion', type: 'varchar', nullable: true })
  codigoAutorizacion!: string | null;

  @Column({ name: 'emisor_tarjeta', type: 'varchar', nullable: true })
  emisorTarjeta!: string | null;

  @Column({ name: 'payment_method_token', type: 'uuid', nullable: true })
  paymentMethodToken!: string | null;
}
