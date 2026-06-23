
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EstadoTarjeta {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
}

@Entity()
export class Tarjeta {
  @PrimaryGeneratedColumn()
  id: number;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 16, unique: true })
  numero: string;
  @Column({ type: 'varchar', length: 100 })
  titular: string;
  @Column()
  fechaExpiracion: string;
  @Column({ type: 'varchar', length: 3 })
  cvv: string;
  @Column({ type: 'int', nullable: true })
  dinero!: number | null;
  @Column({ type: 'enum', enum: EstadoTarjeta, nullable: true })
  estado!: EstadoTarjeta | null;
}