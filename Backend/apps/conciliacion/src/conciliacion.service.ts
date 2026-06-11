import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ConciliacionService {
  private readonly logger = new Logger(ConciliacionService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async conciliar(
    fechaHora: Date,
    archivoId: string,
  ): Promise<number> {
    this.logger.log(
      `Iniciando conciliación: fecha=${fechaHora.toISOString()}, archivo=${archivoId}`,
    );

    const discrepancias = await this.joinTables(fechaHora, archivoId);

    this.logger.log(
      `Conciliación completada: archivo=${archivoId}, ${discrepancias} discrepancias encontradas`,
    );

    return discrepancias;
  }

  private async joinTables(
    fechaHora: Date,
    archivoId: string,
  ): Promise<number> {
    const fechaHoraStr = fechaHora.toISOString();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await queryRunner.manager.query(
        `
        INSERT INTO discrepancias_conciliacion
          (rrn, tipo, monto_interno, monto_banco, fecha_conciliacion, archivo_id, estado)
        SELECT
          COALESCE(t.rrn, ct.rrn_banco)                       AS rrn,
          CASE
            WHEN t.id IS NULL        THEN 'EXISTE_EN_BANCO'
            WHEN ct.rrn_banco IS NULL THEN 'FALTANTE_EN_BANCO'
            ELSE                          'DIFERENCIA_DE_MONTO'
          END::discrepancia_tipo                               AS tipo,
          t.monto                                              AS monto_interno,
          ct.monto_externo                                     AS monto_banco,
          $1::timestamp                                        AS fecha_conciliacion,
          $2                                                   AS archivo_id,
          'ABIERTA'::discrepancia_estado                       AS estado
        FROM transaccion t
        FULL OUTER JOIN conciliacion_temporal ct
          ON  t.rrn = ct.rrn_banco
          AND ct.fecha_hora = $1::timestamp
          AND ct.archivo_id = $2
        WHERE
          DATE(t.created_at) = DATE($1::timestamp)
          AND (
            t.monto != ct.monto_externo
            OR t.id IS NULL
            OR ct.rrn_banco IS NULL
          )
        `,
        [fechaHoraStr, archivoId],
      );

      await queryRunner.commitTransaction();

      return result.rowCount ?? 0;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en matching archivo ${archivoId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
