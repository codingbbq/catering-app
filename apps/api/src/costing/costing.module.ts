import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { CostSheetsController } from './cost-sheets.controller.js';
import { CostSheetsService } from './cost-sheets.service.js';
import { RecipesController } from './recipes.controller.js';
import { RecipesService } from './recipes.service.js';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [RecipesController, CostSheetsController],
  providers: [RecipesService, CostSheetsService],
  exports: [RecipesService, CostSheetsService],
})
export class CostingModule {}
