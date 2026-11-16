import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { PurchaseOrdersController, SuppliersController } from './procurement.controller.js';
import { ProcurementService } from './procurement.service.js';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [SuppliersController, PurchaseOrdersController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
