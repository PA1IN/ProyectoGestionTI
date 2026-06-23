import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EstadoTarjetaGuardadaDb {
  ACTIVA = 'ACTIVA',
  ELIMINADA = 'ELIMINADA',
}

@Index('UQ_tarjeta_activa', ['userId', 'numeroPan'], { unique: true, where: `"estado" = 'ACTIVA'` })
@Entity({ name: 'tarjeta_guardada' })
export class TarjetaGuardada {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'numero_pan', type: 'varchar', length: 19})
  numeroPan!: string;

  @Column({ name: 'exp_month', type: 'int' })
  expMonth!: number;

  @Column({ name: 'exp_year', type: 'int' })
  expYear!: number;

  @Column({ name: 'last4', type: 'varchar', length: 4 })
  last4!: string;

  @Column({ name: 'brand', type: 'varchar', length: 30, nullable: true })
  brand!: string | null;

  @Column({ name: 'holder_name', type: 'varchar', length: 120, nullable: true })
  holderName!: string | null;

  @Column({ name: 'fingerprint', type: 'varchar', length: 128, nullable: true })
  fingerprint!: string | null;

  @Column({ name: 'estado', type: 'enum', enum: EstadoTarjetaGuardadaDb, enumName: 'estado_tarjeta_guardada', default: EstadoTarjetaGuardadaDb.ACTIVA })
  estado!: EstadoTarjetaGuardadaDb;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}