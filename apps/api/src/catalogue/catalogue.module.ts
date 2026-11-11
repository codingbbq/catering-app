import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CatalogueController } from './catalogue.controller.js';
import { CatalogueService } from './catalogue.service.js';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [CatalogueController],
  providers: [CatalogueService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
