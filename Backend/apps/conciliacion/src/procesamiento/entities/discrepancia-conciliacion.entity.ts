import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoDiscrepancia {
  EXISTE_EN_BANCO = 'EXISTE_EN_BANCO',// existe en banco, no en la BD
  FALTANTE_EN_BANCO = 'FALTANTE_EN_BANCO',// existe en la BD, no en banco
  DIFERENCIA_DE_MONTO = 'DIFERENCIA_DE_MONTO',
}

export enum EstadoDiscrepancia {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

@Entity('discrepancias_conciliacion')
@Index(['rrn', 'fecha_conciliacion'])
export class DiscrepanciaConciliacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: true })
  rrn!: number | null;

  @Column({
    type: 'enum',
    enum: TipoDiscrepancia,
    enumName: 'discrepancia_tipo',
    nullable: false,
  })
  tipo!: TipoDiscrepancia;

  @Column({ type: 'int', nullable: true })
  monto_interno!: number | null;

  @Column({ type: 'int', nullable: true })
  monto_banco!: number | null;

  @Column({ type: 'timestamp', nullable: false })
  fecha_conciliacion!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  archivo_id!: string | null;

  @Column({
    type: 'enum',
    enum: EstadoDiscrepancia,
    enumName: 'discrepancia_estado',
    default: EstadoDiscrepancia.ABIERTA,
  })
  estado!: EstadoDiscrepancia;

  @Column({ type: 'uuid', nullable: true })
  resuelto_por!: string | null;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
