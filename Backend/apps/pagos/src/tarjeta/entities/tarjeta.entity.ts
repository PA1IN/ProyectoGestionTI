
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoTarjeta {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

@Entity()
export class Tarjeta {
  @PrimaryGeneratedColumn()
  id!: number;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 16, unique: true })
  numero!: string;
  @Column({ type: 'varchar', length: 100 })
  titular!: string;
  @Column({ name: 'fecha_expiracion', type: 'varchar', length: 7 })
  fechaExpiracion!: string;
  @Column({ type: 'varchar', length: 3 })
  cvv!: string;
  @Column({ type: 'int', nullable: true })
  dinero!: number | null;
  @Column({ name: 'estado', type: 'enum', enum: EstadoTarjeta, enumName: 'estado_tarjeta', nullable: true })
  estado!: EstadoTarjeta | null;
}