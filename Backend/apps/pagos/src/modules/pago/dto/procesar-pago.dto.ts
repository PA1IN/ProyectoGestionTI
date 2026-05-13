import { IsNotEmpty, IsString, Length } from 'class-validator';


export class ProcesarPagoDto {
    @IsNotEmpty({ message: 'El número de tarjeta es requerido' })
    @IsString({ message: 'El número de tarjeta debe ser un string' })
    @Length(16, 16, { message: 'El número de tarjeta debe tener 16 dígitos' })
    numeroTarjeta: string;
    @IsNotEmpty({ message: 'El titular es requerido' })
    @IsString({ message: 'El titular debe ser un string' })
    titular: string;
    @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
    @IsString({ message: 'La fecha de expiración debe ser un string' })
    fechaExpiracion: string;
    @IsNotEmpty({ message: 'El CVV es requerido' })
    @IsString({ message: 'El CVV debe ser un string' })
    @Length(3, 3, { message: 'El CVV debe tener exactamente 3 dígitos' })
    cvv: string;
}