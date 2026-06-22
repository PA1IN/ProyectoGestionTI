import { Column, Entity, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DetalleTransaccion } from './detalle-transaccion.entity';
import { HistorialTransaccion } from './historial-transaccion.entity';
import { EstadoRespuestaTransaccion } from '../enums/estado-respuesta-transaccion.enum';

export enum EstadoTransaccionDb {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
}

export enum TipoOperacionTransaccionDb {
  CIT = 'CIT',
  MIT = 'MIT',
}

@Entity({ name: 'transaccion' })
export class Transaccion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'id_orden' })
  idOrden!: string;

  @Column({ name: 'merchant_credential_id', type: 'uuid', nullable: true })
  merchantCredentialId!: string | null;

  @Column({ name: 'payment_method_token', type: 'uuid', nullable: true })
  paymentMethodToken!: string | null;

  @Column({ name: 'mandate_id', type: 'uuid', nullable: true })
  mandateId!: string | null;

  @Column({ name: 'tipo_operacion', type: 'enum', enum: TipoOperacionTransaccionDb, enumName: 'tipo_operacion_transaccion', nullable: true })
  tipoOperacion!: TipoOperacionTransaccionDb | null;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  monto!: string;

  @Column({ length: 3, default: 'CLP' })
  moneda!: string;

  @Column({ type: 'enum', enum: EstadoTransaccionDb, enumName: 'estado_transaccion', default: EstadoTransaccionDb.PENDING })
  estado!: EstadoTransaccionDb;

  @Column({ name: 'rrn', nullable: true, type: 'int' })
  rrn!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => DetalleTransaccion, (detalle: DetalleTransaccion) => detalle.transaccion)
  detalles!: DetalleTransaccion[];

  @OneToMany(() => HistorialTransaccion, (hist: HistorialTransaccion) => hist.transaccion)
  historial!: HistorialTransaccion[];
}
