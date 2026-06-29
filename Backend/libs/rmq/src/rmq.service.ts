import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

@Injectable()
export class RabbitMqService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqService.name);
  private connection?: any;
  private channel?: any;

  constructor(private readonly configService: ConfigService) {}

  private async getChannel(queueName: string): Promise<any> {
    if (this.channel) return this.channel;

    const rabbitMqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://localhost:5672';
    this.connection = await connect(rabbitMqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(queueName, { durable: true });

    return this.channel;
  }

  async publish(queueName: string, payloadData: any): Promise<void> {
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

  async consume(queueName: string, onMessage: (msg: any) => Promise<void>): Promise<void> {
    try {
      const channel = await this.getChannel(queueName);
      this.logger.log(`Escuchando la cola: ${queueName}`);

      await channel.consume(queueName, async (msg: any) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          
          await onMessage(content); 
          
          channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error procesando mensaje en la cola ${queueName}`);
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