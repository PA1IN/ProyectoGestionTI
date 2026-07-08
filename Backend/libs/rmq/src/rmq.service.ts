import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: any;
  private channel?: any;
  private readonly assertedQueues = new Set<string>();
  private readonly assertedExchanges = new Set<string>();

  constructor(private readonly configService: ConfigService) {}

  private async getConnectionChannel(): Promise<any> {
    const rabbitMqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';

    if (!this.channel) {
      this.connection = await connect(rabbitMqUrl);
      this.channel = await this.connection.createChannel();
    }

    return this.channel;
  }

  private async getChannel(queueName: string): Promise<any> {
    const channel = await this.getConnectionChannel();

    if (!this.assertedQueues.has(queueName)) {
      await this.assertQueue(queueName, { durable: true });
    }

    return channel;
  }

  async assertQueue(queueName: string, options: Record<string, unknown> = { durable: true }): Promise<void> {
    const channel = await this.getConnectionChannel();

    if (!this.assertedQueues.has(queueName)) {
      await channel.assertQueue(queueName, options);
      this.assertedQueues.add(queueName);
    }
  }

  async assertExchange(exchangeName: string, type: string, options: Record<string, unknown> = { durable: true }): Promise<void> {
    const channel = await this.getConnectionChannel();

    if (!this.assertedExchanges.has(exchangeName)) {
      await channel.assertExchange(exchangeName, type, options);
      this.assertedExchanges.add(exchangeName);
    }
  }

  async bindQueue(queueName: string, exchangeName: string, routingKey: string): Promise<void> {
    const channel = await this.getConnectionChannel();
    await channel.bindQueue(queueName, exchangeName, routingKey);
  }

  async publish<T>(queueName: string, payloadData: T): Promise<void> {
    try {
      const channel = await this.getChannel(queueName);

      channel.sendToQueue(queueName, Buffer.from(JSON.stringify(payloadData)), {
        contentType: 'application/json',
        persistent: true,
      });
    } catch (error) {
      this.logger.warn(`Error al publicar en ${queueName}`);
    }
  }

  async consume<T>(queueName: string, onMessage: (payload: T) => Promise<void>): Promise<void> {
    try {
      const channel = await this.getChannel(queueName);
      await channel.consume(queueName, async (msg: any) => {
        if (!msg) return;
        try {
          const content: T = JSON.parse(msg.content.toString());
          
          await onMessage(content); 
          
          channel.ack(msg);
        } catch (error) {
          channel.nack(msg, false, false);
        }
      }, { noAck: false });
    } catch (error) {
      this.logger.error(`Error al iniciar consumidor en ${queueName}`, error);
    }
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}