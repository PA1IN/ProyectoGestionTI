import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoDiscrepancia, DiscrepanciaConciliacion } from './procesamiento/entities/discrepancia-conciliacion.entity';

const USUARIO_SISTEMA_UUID = '00000000-0000-0000-0000-000000000000'; //cabmiar a una validacion con el auth del grupo 12

export interface DiscrepanciaResumen {
  id: number;
  rrn: number | null;
  tipo: string;
  estado: string;
}

@Injectable()
export class ConciliacionService {
  private readonly logger = new Logger(ConciliacionService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DiscrepanciaConciliacion)
    private readonly discrepanciaRepository: Repository<DiscrepanciaConciliacion>,
  ) {}

  async conciliar(
    fechaHora: Date,
    archivoId: string,
  ): Promise<DiscrepanciaResumen[]> {
    this.logger.log(
      `Iniciando conciliación: fecha=${fechaHora.toISOString()}, archivo=${archivoId}`,
    );

    const discrepancias = await this.joinTables(fechaHora, archivoId);

    this.logger.log(
      `Conciliación completada: archivo=${archivoId}, ${discrepancias.length} discrepancias encontradas`,
    );

    return discrepancias;
  }

  async getDiscrepancyByRrn(rrn: number): Promise<DiscrepanciaConciliacion | null> {
    return this.discrepanciaRepository
      .createQueryBuilder('discrepancia')
      .where('discrepancia.rrn = :rrn', { rrn })
      .orderBy('discrepancia.created_at', 'DESC')
      .getOne();
  }

  async closeDiscrepancyByRrn(
    rrn: number,
    resueltoPor = USUARIO_SISTEMA_UUID,
  ): Promise<DiscrepanciaConciliacion | null> {
    const resultado = await this.discrepanciaRepository
      .createQueryBuilder()
      .update(DiscrepanciaConciliacion)
      .set({
        estado: EstadoDiscrepancia.CERRADA,
        resuelto_por: resueltoPor,
      })
      .where('rrn = :rrn', { rrn })
      .returning('*')
      .execute();

    return (resultado.raw?.[0] as DiscrepanciaConciliacion | undefined) ?? null;
  }

  private async joinTables(
    fechaHora: Date,
    archivoId: string,
  ): Promise<DiscrepanciaResumen[]> {
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
          COALESCE(t.rrn, ct.rrn_banco)                      AS rrn,
          CASE
            WHEN t.id IS NULL         THEN 'EXISTE_EN_BANCO'
            WHEN ct.rrn_banco IS NULL THEN 'FALTANTE_EN_BANCO'
            ELSE                           'DIFERENCIA_DE_MONTO'
          END::discrepancia_tipo                             AS tipo,
          t.monto                                            AS monto_interno,
          ct.monto_externo                                   AS monto_banco,
          $1::timestamp                                      AS fecha_conciliacion,
          $2                                                 AS archivo_id,
          'ABIERTA'::discrepancia_estado                     AS estado
        FROM transaccion t
        FULL OUTER JOIN conciliacion_temporal ct
          ON t.rrn = ct.rrn_banco
          AND ct.archivo_id = $2
        WHERE
          COALESCE(DATE(t.created_at), DATE(ct.fecha_hora)) = DATE($1::timestamp)
          AND (
            t.monto != ct.monto_externo
            OR t.id IS NULL
            OR ct.rrn_banco IS NULL 
          )
          RETURNING id, rrn, tipo, estado;
        `,
        [fechaHoraStr, archivoId],
      );

      await queryRunner.commitTransaction();

      return Array.isArray(result)
        ? result.map((discrepancia: Record<string, unknown>): DiscrepanciaResumen => ({
            id: Number(discrepancia.id),
            rrn:
              discrepancia.rrn === null || discrepancia.rrn === undefined
                ? null
                : Number(discrepancia.rrn),
            tipo: String(discrepancia.tipo),
            estado: String(discrepancia.estado),
          }))
        : [];
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en matching archivo ${archivoId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
