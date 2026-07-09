import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UploadConciliacionDto {

  @IsString()
  resuelto_por?: string;

  @IsOptional()
  @IsDateString()
  fecha_hora?: string;

  @IsOptional()
  @IsString()
  archivo_id?: string;
}
