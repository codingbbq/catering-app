import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { DailyMealOrdersController } from './daily-meal-orders.controller.js';
import { DailyMealOrdersService } from './daily-meal-orders.service.js';

@Module({
  imports: [PrismaModule, TenancyModule, InvoicesModule],
  controllers: [DailyMealOrdersController],
  providers: [DailyMealOrdersService],
  exports: [DailyMealOrdersService],
})
export class DailyMealOrdersModule {}
