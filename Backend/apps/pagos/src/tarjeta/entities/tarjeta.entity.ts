
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum EstadoTarjeta {
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  PENDIENTE = 'PENDIENTE',
}

@Entity()
export class Tarjeta {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: 'varchar', length: 16 })
  numero: string;
  @Column({ type: 'varchar', length: 100 })
  titular: string;
  @Column()
  fechaExpiracion: string;
  @Column({ type: 'varchar', length: 3 })
  cvv: string;
  @Column({ type: 'enum', enum: EstadoTarjeta, default: EstadoTarjeta.PENDIENTE })
  estado: EstadoTarjeta;
}