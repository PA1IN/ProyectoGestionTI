import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMqService, WebhookJob } from '@app/rmq';

@Injectable()
export class WebhooksWorkerService implements OnModuleInit {
  
  constructor(private readonly rmqService: RabbitMqService) {}

  async onModuleInit() {
    await this.rmqService.consume<WebhookJob<unknown>>('pagos.notificaciones.webhooks', async (payload) => {
      await this.enviarWebhookACliente(payload.targetUrl, payload.payload);
    });
  }

  private async enviarWebhookACliente(url: string, data: any) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Fallo HTTP');
    console.log(`Webhook enviado correctamente a ${url}`);
  }
}