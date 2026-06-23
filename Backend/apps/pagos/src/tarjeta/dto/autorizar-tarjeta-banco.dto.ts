import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class AutorizarTarjetaBancoDto {
  @IsNotEmpty({ message: 'El número de tarjeta es requerido' })
  @IsString({ message: 'El número de tarjeta debe ser un string' })
  @Length(13, 19, { message: 'El número de tarjeta debe tener entre 13 y 19 dígitos' })
  @Matches(/^\d+$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  numero!: string;

  @IsNotEmpty({ message: 'El titular es requerido' })
  @IsString({ message: 'El titular debe ser un string' })
  titular!: string;

  @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
  @IsString({ message: 'La fecha de expiración debe ser un string' })
  @Matches(/^\d{2}\/\d{2,4}$/, { message: 'La fecha debe estar en formato MM/YY o MM/YYYY' })
  fechaExpiracion!: string;

  @IsOptional()
  @IsString({ message: 'El CVV debe ser un string' })
  @Length(3, 4, { message: 'El CVV debe tener entre 3 y 4 dígitos' })
  @Matches(/^\d+$/, { message: 'El CVV debe contener solo dígitos' })
  cvv?: string;

  @IsInt({ message: 'El monto debe ser un entero' })
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  monto!: number;
}