import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
