import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteTarjetaGuardadaDto {
    @IsNotEmpty({ message: 'El usuario es requerido' })
    @IsString({ message: 'El usuario debe ser un string' })
    userId!: string;

    @IsNotEmpty({ message: 'El token es requerido' })
    @IsString({ message: 'El token debe ser un string' })
    token!: string;
}