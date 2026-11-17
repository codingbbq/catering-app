import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';
import { GatewayRouterService } from './gateway-router.service.js';
import { PlatformCommunicationsController } from './platform-communications.controller.js';
import { QuotaMeteringService } from './quota-metering.service.js';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [CommunicationsController, PlatformCommunicationsController],
  providers: [
    CommunicationsService,
    GatewayRouterService,
    QuotaMeteringService,
  ],
  exports: [CommunicationsService, GatewayRouterService, QuotaMeteringService],
})
export class CommunicationsModule {}
