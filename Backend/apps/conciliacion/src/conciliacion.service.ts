import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EstadoDiscrepancia, DiscrepanciaConciliacion } from './procesamiento/entities/discrepancia-conciliacion.entity';
import {
  CONCILIATION_ALERTS_ANALYTICS_QUEUE,
  ConciliationAlert,
  RabbitMqService,
  WebhookJob,
} from '@app/rmq';

const USUARIO_SISTEMA_UUID = '00000000-0000-0000-0000-000000000000'; //cabmiar a una validacion con el auth del grupo 12

export interface DiscrepanciaResumen {
  id: number;
  rrn: number | null;
  idTransaccion: string | null;
  tipo: string;
  estado: string;
  montoInterno: number | null;
  montoBanco: number | null;
  archivoId: string | null;
}

@Injectable()
export class ConciliacionService {
  private readonly logger = new Logger(ConciliacionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly rmqService: RabbitMqService,
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

    await this.publicarAlertasConciliacion(discrepancias, archivoId);

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
          (rrn, id_transaccion, tipo, monto_interno, monto_banco, fecha_conciliacion, archivo_id, estado)
        SELECT
            COALESCE(t.rrn, ct.rrn_banco)                      AS rrn,
          t.id                                               AS id_transaccion,
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
          RETURNING id, rrn, id_transaccion, tipo, estado, monto_interno, monto_banco, archivo_id;
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
            idTransaccion:
              discrepancia.id_transaccion === null || discrepancia.id_transaccion === undefined
                ? null
                : String(discrepancia.id_transaccion),
            tipo: String(discrepancia.tipo),
            estado: String(discrepancia.estado),
            montoInterno:
              discrepancia.monto_interno === null || discrepancia.monto_interno === undefined
                ? null
                : Number(discrepancia.monto_interno),
            montoBanco:
              discrepancia.monto_banco === null || discrepancia.monto_banco === undefined
                ? null
                : Number(discrepancia.monto_banco),
            archivoId:
              discrepancia.archivo_id === null || discrepancia.archivo_id === undefined
                ? null
                : String(discrepancia.archivo_id),
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
  async getAllDiscrepancies(): Promise<DiscrepanciaConciliacion[]> {
    return this.discrepanciaRepository.find({
      order: { created_at: 'DESC' }, 
    });
  }

  private async publicarAlertasConciliacion(discrepancias: DiscrepanciaResumen[], archivoId: string): Promise<void> {
    const webhookUrl = this.configService.get<string>('CONCILIATION_WEBHOOK_URL') || null;

    for (const discrepancia of discrepancias) {
      const alerta: ConciliationAlert = {
        sistema_id: this.configService.get<string>('SYSTEM_ID') || 'P04',
        creado_en: new Date().toISOString(),
        payload: discrepancia.tipo === 'DIFERENCIA_DE_MONTO'
          ? {
              tipo: 'Conciliacion',
              tipo_discrepancia: 'DIFERENCIA_DE_MONTO',
              rrn: discrepancia.rrn,
              id_transaccion: discrepancia.idTransaccion,
              id_archivo: discrepancia.archivoId ?? archivoId,
              monto_interno: discrepancia.montoInterno,
              monto_banco: discrepancia.montoBanco,
            }
          : {
              tipo: 'Conciliacion',
              tipo_discrepancia: discrepancia.tipo === 'EXISTE_EN_BANCO' ? 'EXISTE_EN_BANCO' : 'FALTANTE_EN_BANCO',
              rrn: discrepancia.rrn,
              id_transaccion: discrepancia.idTransaccion,
              id_archivo: discrepancia.archivoId ?? archivoId,
            },
      };

      await this.rmqService.publish<ConciliationAlert>(CONCILIATION_ALERTS_ANALYTICS_QUEUE, alerta);

      if (webhookUrl) {
        await this.rmqService.publish<WebhookJob<ConciliationAlert>>('pagos.notificaciones.webhooks', {
          targetUrl: webhookUrl,
          payload: alerta,
          headers: process.env.PROY11_WEBHOOK_API_KEY
            ? { 'x-api-key': process.env.PROY11_WEBHOOK_API_KEY }
            : undefined,
        });
      }
    }
  }
}
