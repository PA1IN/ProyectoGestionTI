import { Module } from '@nestjs/common';
import { RmqModule } from '@app/rmq';
import { WebhooksWorkerService } from './webhook-worker.service';

@Module({
  imports: [RmqModule],
  providers: [WebhooksWorkerService],
})
export class WebhooksWorkerModule {}