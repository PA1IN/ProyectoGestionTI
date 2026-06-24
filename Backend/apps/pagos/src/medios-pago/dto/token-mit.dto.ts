import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Length, Matches, ValidateNested } from 'class-validator';

export class CardPaymentDto {
  @IsNotEmpty({ message: 'El número de tarjeta es requerido' })
  @IsString({ message: 'El número de tarjeta debe ser un string' })
  @Length(13, 19, { message: 'El número de tarjeta debe tener entre 13 y 19 dígitos' })
  @Matches(/^\d+$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  numero!: string;

  @IsNotEmpty({ message: 'El mes de expiración es requerido' })
  @IsString({ message: 'El mes de expiración debe ser un string' })
  @Matches(/^(0?[1-9]|1[0-2])$/, { message: 'El mes de expiración debe estar entre 1 y 12' })
  exp_mes!: string;

  @IsNotEmpty({ message: 'El año de expiración es requerido' })
  @IsString({ message: 'El año de expiración debe ser un string' })
  @Matches(/^\d{4}$/, { message: 'El año de expiración debe tener 4 dígitos' })
  exp_ano!: string;

  @IsNotEmpty({ message: 'El CVC es requerido' })
  @IsString({ message: 'El CVC debe ser un string' })
  @Length(3, 4, { message: 'El CVC debe tener entre 3 y 4 dígitos' })
  @Matches(/^\d+$/, { message: 'El CVC debe contener solo dígitos' })
  cvc!: string;
}

export class TokenizarMitDto {
  @IsNotEmpty({ message: 'La tarjeta es requerida' })
  @ValidateNested()
  @Type(() => CardPaymentDto)
  tarjeta!: CardPaymentDto;

  @IsNotEmpty({ message: 'El usuario es requerido' })
  @IsUUID()
  @IsString({ message: 'El usuario debe ser un string' })
  userId!: string;

  @IsOptional()
  @IsString({ message: 'El titular debe ser un string' })
  titular?: string;
}