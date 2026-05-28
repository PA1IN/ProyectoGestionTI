import { PartialType } from '@nestjs/mapped-types';
import { CreateTransaccionDto } from './create-transaccion.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { EstadoRespuestaTransaccion } from '../enums/estado-respuesta-transaccion.enum';

export class UpdateTransaccionDto extends PartialType(CreateTransaccionDto) {
  @IsOptional()
  @IsEnum(EstadoRespuestaTransaccion)
  estado?: EstadoRespuestaTransaccion;
}
