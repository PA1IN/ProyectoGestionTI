import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Length } from 'class-validator';

enum MonedaPagoDto {
  CLP = 'CLP',
  USD = 'USD',
}

export class MitDto {
  @IsNotEmpty({ message: 'El id de orden es requerido' })
  @IsString({ message: 'El id de orden debe ser un string' })
  @Length(1, 100, { message: 'El id de orden debe tener entre 1 y 100 caracteres' })
  idOrden!: string;

  @IsNotEmpty({ message: 'El monto es requerido' })
  monto!: number;

  @IsEnum(MonedaPagoDto, { message: 'La moneda debe ser clp o usd' })
  moneda!: MonedaPagoDto;

  @IsUUID('4', { message: 'paymentMethodToken debe ser un UUID válido' })
  paymentMethodToken!: string;

  @IsOptional()
  @IsString({ message: 'El cliente debe ser un string' })
  customer?: string;
}