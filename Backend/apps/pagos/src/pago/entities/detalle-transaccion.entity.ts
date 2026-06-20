import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from 'typeorm';
import { Transaccion } from './transaccion.entity';

export enum TipoPagoDb {
  TARJETA = 'TARJETA',
  BILLETERA = 'BILLETERA',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

@Entity({ name: 'detalle_transaccion' })
export class DetalleTransaccion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'nombre_usuario' })
  nombreUsuario!: string;

  @Column()
  rut!: string;

  @ManyToOne(() => Transaccion, (transaccion: Transaccion) => transaccion.detalles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_transaccion' })
  transaccion!: Transaccion;

  @Column({ name: 'metodo_pago', type: 'enum', enum: TipoPagoDb, enumName: 'tipo_pago' })
  tipoPago!: TipoPagoDb;

  @Column({ name: 'ultimos_cuatro', length: 4, nullable: true })
  ultimosCuatro!: string;

  @Column({ nullable: true, type: 'int' })
  cuotas!: number;

  @Column({ name: 'codigo_autorizacion', nullable: true })
  codigoAutorizacion!: string;

  @Column({ name: 'emisor_tarjeta', nullable: true })
  emisorTarjeta!: string;
}
