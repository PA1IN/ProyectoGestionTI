import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UploadConciliacionDto {

  @IsOptional()
  @IsDateString()
  fecha_hora?: string;

  @IsOptional()
  @IsString()
  archivo_id?: string;
}
