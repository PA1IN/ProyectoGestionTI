import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EstadoMandatoPagoDb {
  ACTIVO = 'ACTIVO',
  SUSPENDIDO = 'SUSPENDIDO',
  REVOCADO = 'REVOCADO',
}

@Entity({ name: 'mandato_pago' })
export class MandatoPago {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'merchant_credential_id', type: 'uuid' })
  merchantCredentialId!: string;

  @Column({ name: 'payment_method_token', type: 'uuid' })
  paymentMethodToken!: string;

  @Column({ name: 'initial_transaction_id', type: 'uuid', nullable: true })
  initialTransactionId!: string | null;

  @Column({ name: 'currency', type: 'char', length: 3, default: 'CLP' })
  currency!: string;

  @Column({ name: 'recurrence_type', type: 'varchar', length: 50, nullable: true })
  recurrenceType!: string | null;

  @Column({ name: 'amount_limit', type: 'decimal', precision: 18, scale: 2, nullable: true })
  amountLimit!: string | null;

  @Column({ name: 'estado', type: 'enum', enum: EstadoMandatoPagoDb, enumName: 'estado_mandato_pago', default: EstadoMandatoPagoDb.ACTIVO })
  estado!: EstadoMandatoPagoDb;

  @CreateDateColumn({ name: 'consent_at' })
  consentAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}