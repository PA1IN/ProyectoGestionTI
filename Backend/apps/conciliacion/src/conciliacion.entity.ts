import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('conciliacion_temporal')
@Index(['rrn_banco', 'fecha_hora'], { unique: true })
export class ConciliacionTemporal {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', nullable: false })
  rrn_banco!: number;

  @Column({ type: 'int', nullable: false })
  monto_externo!: number;

  @Column({ type: 'timestamp', nullable: false })
  @Index()
  fecha_hora!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  archivo_id!: string | null;

  @CreateDateColumn()
  created_at!: Date;
}
