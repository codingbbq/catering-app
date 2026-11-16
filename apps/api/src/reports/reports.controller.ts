import type { AuthenticatedTenantContext } from '@catering/shared-types';
import { reportFilterQuerySchema } from '@catering/shared-types';
import { Controller, Get, Query } from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@AccessScope('tenant')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('dashboard-overview')
  async getDashboardOverview(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.reportsService.getDashboardOverview(tenantCtx.tenantId);
  }

  @Get('sales-summary')
  async getSalesSummary(
    @CurrentRequestContext() ctx: unknown,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const filter = reportFilterQuerySchema.parse({
      period: period || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    return this.reportsService.getSalesSummary(tenantCtx.tenantId, filter);
  }

  @Get('booking-summary')
  async getBookingSummary(
    @CurrentRequestContext() ctx: unknown,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const filter = reportFilterQuerySchema.parse({
      period: period || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    return this.reportsService.getBookingSummary(tenantCtx.tenantId, filter);
  }

  @Get('finance-summary')
  async getFinanceSummary(
    @CurrentRequestContext() ctx: unknown,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const filter = reportFilterQuerySchema.parse({
      period: period || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    return this.reportsService.getFinanceSummary(tenantCtx.tenantId, filter);
  }

  @Get('operations-summary')
  async getOperationsSummary(
    @CurrentRequestContext() ctx: unknown,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const filter = reportFilterQuerySchema.parse({
      period: period || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    return this.reportsService.getOperationsSummary(tenantCtx.tenantId, filter);
  }
}
