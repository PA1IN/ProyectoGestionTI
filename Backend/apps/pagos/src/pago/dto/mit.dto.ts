import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

enum MonedaPagoDto {
  CLP = 'CLP',
  USD = 'USD',
}

export class MitDto {
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