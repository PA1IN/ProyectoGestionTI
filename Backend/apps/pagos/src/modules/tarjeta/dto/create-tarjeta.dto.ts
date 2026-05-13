import { IsString, IsNotEmpty, Length, Matches, IsEnum, IsOptional } from 'class-validator';
import { EstadoTarjeta } from '../entities/tarjeta.entity';

export class CreateTarjetaDto {
  @IsNotEmpty({ message: 'El número de tarjeta es requerido' })
  @IsString({ message: 'El número debe ser un string' })
  @Length(16, 16, { message: 'El número de tarjeta debe tener 16 dígitos' })
  @Matches(/^\d+$/, { message: 'El número debe contener solo dígitos' })
  numero: string;

  @IsNotEmpty({ message: 'El titular es requerido' })
  @IsString({ message: 'El titular debe ser un string' })
  @Length(3, 100, { message: 'El titular debe tener entre 3 y 100 caracteres' })
  titular: string;

  @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
  @IsString({ message: 'La fecha debe ser un string' })
  @Matches(/^\d{2}\/\d{2}$/, { message: 'La fecha debe estar en formato MM/YY' })
  fechaExpiracion: string;

  @IsNotEmpty({ message: 'El CVV es requerido' })
  @IsString({ message: 'El CVV debe ser un string' })
  @Length(3, 3, { message: 'El CVV debe tener exactamente 3 dígitos' })
  @Matches(/^\d+$/, { message: 'El CVV debe contener solo dígitos' })
  cvv: string;

  @IsOptional()
  @IsEnum(EstadoTarjeta, { message: 'El estado debe ser APROBADO, RECHAZADO o PENDIENTE' })
  estado?: EstadoTarjeta;
}
