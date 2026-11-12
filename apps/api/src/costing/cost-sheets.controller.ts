import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  costSheetCalculationInputSchema,
  costSheetSearchParamsSchema,
  createCostSheetRequestSchema,
  updateCostSheetRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { CostSheetsService } from './cost-sheets.service.js';

@Controller()
@AccessScope('tenant')
export class CostSheetsController {
  constructor(private readonly costSheetsService: CostSheetsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Post('cost-sheets/calculate')
  async calculateCostSheet(@Body() body: unknown) {
    const dto = costSheetCalculationInputSchema.parse(body);
    return this.costSheetsService.calculate(dto);
  }

  @Get('cost-sheets')
  async listCostSheets(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'draft' | 'archived' | 'all',
    @Query('menuId') menuId?: string,
    @Query('recipeId') recipeId?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = costSheetSearchParamsSchema.parse({
      search,
      status,
      menuId,
      recipeId,
    });
    return this.costSheetsService.listCostSheets(tenantCtx.tenantId, parsed);
  }

  @Post('cost-sheets')
  async createCostSheet(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createCostSheetRequestSchema.parse(body);
    return this.costSheetsService.createCostSheet(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('cost-sheets/:costSheetId')
  async getCostSheet(
    @CurrentRequestContext() ctx: unknown,
    @Param('costSheetId') costSheetId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.costSheetsService.getCostSheetById(
      tenantCtx.tenantId,
      costSheetId,
    );
  }

  @Patch('cost-sheets/:costSheetId')
  async updateCostSheet(
    @CurrentRequestContext() ctx: unknown,
    @Param('costSheetId') costSheetId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateCostSheetRequestSchema.parse(body);
    return this.costSheetsService.updateCostSheet(
      tenantCtx.tenantId,
      costSheetId,
      tenantCtx.userId,
      dto,
    );
  }

  @Delete('cost-sheets/:costSheetId')
  async deleteCostSheet(
    @CurrentRequestContext() ctx: unknown,
    @Param('costSheetId') costSheetId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.costSheetsService.deleteCostSheet(
      tenantCtx.tenantId,
      costSheetId,
      tenantCtx.userId,
    );
  }
}
