import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitMqService } from './rmq.service';

@Module({
  imports: [ConfigModule],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class RmqModule {}