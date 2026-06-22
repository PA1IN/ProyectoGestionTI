import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum EstadoCredencialComercioDb {
  ACTIVA = 'ACTIVA',
  INACTIVA = 'INACTIVA',
}

@Entity({ name: 'credencial_comercio' })
export class CredencialComercio {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ name: 'nombre_comercio', type: 'varchar', length: 150, unique: true })
  nombreComercio!: string;

  @Column({ name: 'public_key', type: 'varchar', length: 128, unique: true })
  publicKey!: string;

  @Column({ name: 'private_key', type: 'varchar', length: 128, unique: true })
  privateKey!: string;

  @Column({ name: 'estado', type: 'enum', enum: EstadoCredencialComercioDb, enumName: 'estado_credencial_comercio', default: EstadoCredencialComercioDb.ACTIVA })
  estado!: EstadoCredencialComercioDb;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}