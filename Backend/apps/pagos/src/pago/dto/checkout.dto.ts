import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CheckoutDto {
  @IsNotEmpty({ message: 'El id de orden es requerido' })
  @IsString({ message: 'El id de orden debe ser un string' })
  @Length(1, 100, { message: 'El id de orden debe tener entre 1 y 100 caracteres' })
  idOrden!: string;
  @IsNotEmpty({ message: 'El número de tarjeta es requerido' })
  @IsString({ message: 'El número de tarjeta debe ser un string' })
  @Length(13, 19, { message: 'El número de tarjeta debe tener entre 13 y 19 dígitos' })
  @Matches(/^\d+$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  numeroTarjeta!: string;

  @IsNotEmpty({ message: 'La fecha de expiración es requerida' })
  @IsString({ message: 'La fecha de expiración debe ser un string' })
  @Matches(/^(0?[1-9]|1[0-2])\/(\d{2}|\d{4})$/, { message: 'La fecha de expiración debe tener el formato MM/AA o MM/AAAA' })
  fechaExpiracion!: string;

  @IsNotEmpty({ message: 'El CVV es requerido' })
  @IsString({ message: 'El CVV debe ser un string' })
  @Length(3, 4, { message: 'El CVV debe tener entre 3 y 4 dígitos' })
  @Matches(/^\d+$/, { message: 'El CVV debe contener solo dígitos' })
  cvv!: string;

  @IsOptional()
  @IsString({ message: 'El titular debe ser un string' })
  titular?: string;
}
