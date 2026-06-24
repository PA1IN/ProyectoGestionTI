import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { EstadoCredencialComercioDb } from '../entities/credencial-comercio.entity';

export class CreateComercioDto {
  @IsNotEmpty({ message: 'El nombre del comercio es requerido' })
  @IsString({ message: 'El nombre del comercio debe ser un string' })
  @Length(3, 150, { message: 'El nombre del comercio debe tener entre 3 y 150 caracteres' })
  nombreComercio!: string;

  @IsOptional()
  @IsEnum(EstadoCredencialComercioDb, { message: 'El estado debe ser ACTIVA o INACTIVA' })
  estado?: EstadoCredencialComercioDb;

  @IsNotEmpty({ message: 'La URL del webhook es requerida' })
  @IsUrl({ require_tld: false }, { message: 'La URL del webhook debe ser una URL válida' })
  webhookUrl!: string;
}