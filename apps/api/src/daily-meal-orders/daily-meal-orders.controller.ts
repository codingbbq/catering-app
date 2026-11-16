import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createDailyMealOrderRequestSchema,
  createDailyMealPlanRequestSchema,
  createInvoiceFromMealOrderRequestSchema,
  dailyMealOrderFilterParamsSchema,
  generateOrdersFromPlanRequestSchema,
  updateDailyMealOrderRequestSchema,
  updateDailyMealOrderStatusRequestSchema,
  updateDailyMealPlanRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { DailyMealOrdersService } from './daily-meal-orders.service.js';

@Controller()
@AccessScope('tenant')
export class DailyMealOrdersController {
  constructor(private readonly dailyMealOrdersService: DailyMealOrdersService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  // ==========================================
  // Daily Meal Orders
  // ==========================================

  @Get('daily-meal-orders')
  async listOrders(
    @CurrentRequestContext() ctx: unknown,
    @Query('status') status?: string,
    @Query('serviceSlot') serviceSlot?: string,
    @Query('customerId') customerId?: string,
    @Query('planId') planId?: string,
    @Query('serviceDate') serviceDate?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = dailyMealOrderFilterParamsSchema.parse({
      status: status || undefined,
      serviceSlot: serviceSlot || undefined,
      customerId: customerId || undefined,
      planId: planId || undefined,
      serviceDate: serviceDate || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: search || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return this.dailyMealOrdersService.listOrders(tenantCtx.tenantId, parsed);
  }

  @Get('daily-meal-orders/stats')
  async getOrderStats(
    @CurrentRequestContext() ctx: unknown,
    @Query('date') date?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.dailyMealOrdersService.getOrderStats(
      tenantCtx.tenantId,
      date || undefined,
      fromDate || undefined,
      toDate || undefined,
    );
  }

  @Post('daily-meal-orders')
  async createOrder(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createDailyMealOrderRequestSchema.parse(body);
    return this.dailyMealOrdersService.createOrder(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('daily-meal-orders/:id')
  async getOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.dailyMealOrdersService.getOrder(tenantCtx.tenantId, id);
  }

  @Patch('daily-meal-orders/:id')
  async updateOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateDailyMealOrderRequestSchema.parse(body);
    return this.dailyMealOrdersService.updateOrder(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Post('daily-meal-orders/:id/status')
  async updateOrderStatus(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateDailyMealOrderStatusRequestSchema.parse(body);
    return this.dailyMealOrdersService.updateOrderStatus(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Post('daily-meal-orders/:id/confirm')
  async confirmOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.dailyMealOrdersService.updateOrderStatus(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      { status: 'confirmed' },
    );
  }

  @Post('daily-meal-orders/:id/invoice')
  async createInvoiceForOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body?: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = body
      ? createInvoiceFromMealOrderRequestSchema.partial().parse(body)
      : undefined;
    const invoiceOpts: { title?: string; dueDate?: string; notes?: string } = {};
    if (parsed?.title) invoiceOpts.title = parsed.title;
    if (parsed?.dueDate) invoiceOpts.dueDate = parsed.dueDate;
    if (parsed?.notes) invoiceOpts.notes = parsed.notes;

    return this.dailyMealOrdersService.createInvoiceForOrder(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      parsed ? invoiceOpts : undefined,
    );
  }

  // ==========================================
  // Daily Meal Plans
  // ==========================================

  @Get('daily-meal-plans')
  async listPlans(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.dailyMealOrdersService.listPlans(tenantCtx.tenantId);
  }

  @Post('daily-meal-plans')
  async createPlan(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createDailyMealPlanRequestSchema.parse(body);
    return this.dailyMealOrdersService.createPlan(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('daily-meal-plans/:id')
  async getPlan(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.dailyMealOrdersService.getPlan(tenantCtx.tenantId, id);
  }

  @Patch('daily-meal-plans/:id')
  async updatePlan(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateDailyMealPlanRequestSchema.parse(body);
    return this.dailyMealOrdersService.updatePlan(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Post('daily-meal-plans/:id/generate-orders')
  async generateOrdersFromPlan(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = generateOrdersFromPlanRequestSchema.parse(body);
    return this.dailyMealOrdersService.generateOrdersFromPlan(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }
}
