import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadConciliacionDto } from './dto/upload.dto';
import { ProcesamientoService } from './procesamiento.service';
import { ConciliacionService } from '../conciliacion.service';

@Controller('conciliacion/procesamiento')
export class ProcesamientoController {
  constructor(
    private readonly procesamientoService: ProcesamientoService,
    private readonly conciliacionService: ConciliacionService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('archivo', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/i)) {
          return cb(
            new BadRequestException('Solo se aceptan archivos .csv'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )

  async uploadArchivo(
    @UploadedFile() archivo: Express.Multer.File,
    @Body() dto: UploadConciliacionDto,
  ) {
    if (!archivo) {
      throw new BadRequestException('Se requiere el campo "archivo"');
    }

    const fechaHora = dto.fecha_hora ? new Date(dto.fecha_hora) : new Date();

    const archivoId = dto.archivo_id ?? archivo.originalname;

    const insertadas = await this.procesamientoService.procesarArchivoCsv(
      archivo.buffer,
      fechaHora,
      archivoId,
    );

    const discrepancias = await this.conciliacionService.conciliar(fechaHora, archivoId);

    return {
      mensaje: 'Archivo procesado exitosamente',
      archivo_id: archivoId,
      fecha_hora: fechaHora.toISOString(),
      registros_banco: insertadas,
      discrepancias_encontradas: discrepancias,
    };
  }
}
