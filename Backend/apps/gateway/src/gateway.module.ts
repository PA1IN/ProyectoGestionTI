import { Module } from '@nestjs/common';
import { ConfigModule } from '@libs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';

@Module({
  imports: [ConfigModule],
  controllers: [GatewayController],
  providers: [GatewayService],
})
export class GatewayModule {}