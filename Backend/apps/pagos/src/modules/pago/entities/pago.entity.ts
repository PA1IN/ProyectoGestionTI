import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';   
import { Tarjeta } from '../../tarjeta/entities/tarjeta.entity';


@Entity()
export class Pago {
    @PrimaryGeneratedColumn()
    id: number;
    @Column()
    monto: number;
    @Column()
    moneda: string;

    @ManyToOne(() => Tarjeta, { nullable: false })
    @JoinColumn({ name: 'tarjetaId' })
    tarjeta: Tarjeta;
    @Column()
    createdAt: Date;
    @Column()
    updatedAt: Date;
    @Column()
    referenciaExterna: string;
    @Column({ enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'], default: 'PENDIENTE' })
    estado: string;


}
