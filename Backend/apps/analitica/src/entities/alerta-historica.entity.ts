import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum TipoAlertaHistorica {
  TRANSACCION = 'TRANSACCION',
  CONCILIACION = 'CONCILIACION',
}

export enum ErrorAlertaHistorica {
  NOT_EQUAL = 'NOT_EQUAL',
  RETRY_WARNING = 'RETRY_WARNING',
  EXISTE_EN_BANCO = 'EXISTE_EN_BANCO',
  FALTANTE_EN_BANCO = 'FALTANTE_EN_BANCO',
  DIFERENCIA_DE_MONTO = 'DIFERENCIA_DE_MONTO',
}

@Entity({ name: 'alerta_historica' })
@Index(['tipo', 'error'])
export class AlertaHistorica {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tipo', type: 'enum', enum: TipoAlertaHistorica, enumName: 'tipo_alerta_historica' })
  tipo!: TipoAlertaHistorica;

  @Column({ name: 'error', type: 'enum', enum: ErrorAlertaHistorica, enumName: 'error_alerta_historica' })
  error!: ErrorAlertaHistorica;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'event_created_at', type: 'timestamp', nullable: true })
  eventCreatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}