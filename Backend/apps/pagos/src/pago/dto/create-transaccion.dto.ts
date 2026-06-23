import { IsNotEmpty, IsNumber, IsString, IsUrl, Length, Min } from 'class-validator';

export class CreateTransaccionDto {
  @IsNotEmpty({ message: 'El id de orden es requerido' })
  @IsString({ message: 'El id de orden debe ser un string' })
  @Length(1, 100, { message: 'El id de orden debe tener entre 1 y 100 caracteres' })
  idOrden: string;

  @IsNotEmpty({ message: 'El monto es requerido' })
  @IsNumber({}, { message: 'El monto debe ser numérico' })
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  monto: number;

  @IsNotEmpty({ message: 'La moneda es requerida' })
  @IsString({ message: 'La moneda debe ser un string' })
  moneda: string;

  @IsNotEmpty({ message: 'El nombre del comercio es requerido' })
  @IsString({ message: 'El nombre del comercio debe ser un string' })
  nombreComercio: string;

  @IsNotEmpty({ message: 'La URL de retorno es requerida' })
  @IsUrl({ require_tld: false }, { message: 'La URL de retorno debe ser una URL válida' })
  returnUrl: string;
}
