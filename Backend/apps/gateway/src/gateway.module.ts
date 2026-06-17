import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@libs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { KeycloakAuthGuard } from './auth/keycloak-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    {
      provide: APP_GUARD,
      useClass: KeycloakAuthGuard,
    },
  ],
})
export class GatewayModule {}