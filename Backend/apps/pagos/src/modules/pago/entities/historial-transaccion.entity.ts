import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn } from 'typeorm';
import { EstadoTransaccionDb, Transaccion } from './transaccion.entity';

@Entity({ name: 'historial_transaccion' })
export class HistorialTransaccion {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Transaccion, (transaccion: Transaccion) => transaccion.historial, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_transaccion' })
  transaccion!: Transaccion;

  @Column({ name: 'status_from', type: 'enum', enum: EstadoTransaccionDb, enumName: 'estado_transaccion', nullable: true })
  statusFrom!: EstadoTransaccionDb;

  @Column({ name: 'status_to', type: 'enum', enum: EstadoTransaccionDb, enumName: 'estado_transaccion', nullable: true })
  statusTo!: EstadoTransaccionDb;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
