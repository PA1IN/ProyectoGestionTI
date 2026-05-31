import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type Channel, type Connection } from 'amqplib';

export type TransactionFailureAlert = {
  transactionId: string;
  monto?: number;
  moneda?: string;
  nombreComercio?: string;
  reason: string;
  errorName: string;
  stage: 'token-validation' | 'process-transaction';
  occurredAt: string;
};

@Injectable()
export class RabbitMqPublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisherService.name);
  private readonly queueName = 'pagos.alertas.transacciones-fallidas';
  private connection?: Connection;
  private channel?: Channel;

  constructor(private readonly configService: ConfigService) {}

  async publishTransactionFailure(alert: TransactionFailureAlert): Promise<void> {
    try {
      const channel = await this.getChannel();
      const payload = Buffer.from(JSON.stringify(alert));

      channel.sendToQueue(this.queueName, payload, {
        contentType: 'application/json',
        persistent: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`No se pudo publicar la alerta en RabbitMQ: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const rabbitMqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
    this.connection = await connect(rabbitMqUrl);
    this.connection.on('error', (error) => this.logger.warn(`RabbitMQ connection error: ${error.message}`));
    this.connection.on('close', () => {
      this.connection = undefined;
      this.channel = undefined;
    });

    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(this.queueName, { durable: true });

    return this.channel;
  }

  private async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = undefined;
    }

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }
  }
}