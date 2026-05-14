import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as csv from 'csv-parse/sync';
import { ConciliacionTemporal } from '../conciliacion.entity';

interface FilaBanco {
  rrn_banco: number;
  monto_externo: number;
  fecha_hora: Date;
}

const BATCH_SIZE = 500;

@Injectable()
export class ProcesamientoService {
  private readonly logger = new Logger(ProcesamientoService.name);

  constructor(
    @InjectRepository(ConciliacionTemporal)
    private readonly temporalRepo: Repository<ConciliacionTemporal>,
    private readonly dataSource: DataSource,
  ) {}

  async procesarArchivoCsv(
    buffer: Buffer,
    fechaHora: Date,
    archivoId: string,
  ): Promise<number> {
    const filas = this.parsearCsv(buffer);

    if (filas.length === 0) {
      throw new BadRequestException('El archivo CSV no contiene filas validas');
    }

    this.logger.log(
      `Archivo ${archivoId}: ${filas.length} filas para ${fechaHora.toISOString()}`,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.insertarEnTemporal(filas, fechaHora, archivoId, queryRunner);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Archivo ${archivoId} guardado en temporal, ${filas.length} registros`,
      );

      return filas.length;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        throw new ConflictException(
          `El archivo ${archivoId} ya fue procesado anteriormente`,
        );
      }

      this.logger.error(`Error archivo ${archivoId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parsearCsv(buffer: Buffer): FilaBanco[] {
    let registros: Record<string, string>[];

    try {
      registros = csv.parse(buffer, { 
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Record<string, string>[];
    } catch {
      throw new BadRequestException(
        'No se pudo parsear el CSV.',
      );
    }

    return registros
      .map((row, index) => this.validarFila(row, index + 2))
      .filter((row): row is FilaBanco => row !== null);
  }

  private validarFila(
    row: Record<string, string>,
    lineaNum: number,
  ): FilaBanco | null {
    const rrn = parseInt(row['rrn'], 10);
    const monto = parseInt(row['monto'], 10);
    const fechaHoraStr = row['fecha_hora'];

    if (isNaN(rrn) || rrn <= 0) {
      this.logger.warn(`Línea ${lineaNum}: RRN inválido ("${row['rrn']}"), descartada`);
      return null;
    }

    if (isNaN(monto) || monto < 0) {
      this.logger.warn(`Línea ${lineaNum}: monto inválido ("${row['monto']}"), descartada`);
      return null;
    }

    const fechaHora = new Date(fechaHoraStr);
    if (isNaN(fechaHora.getTime())) {
      this.logger.warn(`Línea ${lineaNum}: fecha_hora inválida ("${fechaHoraStr}"), descartada`);
      return null;
    }

    return { rrn_banco: rrn, monto_externo: monto, fecha_hora: fechaHora };
  }

  private async insertarEnTemporal(
    filas: FilaBanco[],
    fechaHora: Date,
    archivoId: string,
    queryRunner: any,
  ): Promise<void> {
    for (let i = 0; i < filas.length; i += BATCH_SIZE) {
      const batch = filas.slice(i, i + BATCH_SIZE);

      const entidades = batch.map((fila) =>
        this.temporalRepo.create({
          rrn_banco: fila.rrn_banco,
          monto_externo: fila.monto_externo,
          fecha_hora: fila.fecha_hora,
          archivo_id: archivoId,
        }),
      );

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(ConciliacionTemporal)
        .values(entidades)
        .orIgnore()
        .execute();
    }
  }
}
