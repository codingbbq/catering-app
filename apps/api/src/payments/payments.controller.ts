import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createPaymentAllocationsRequestSchema,
  createPaymentRequestSchema,
  paymentFilterParamsSchema,
  voidPaymentRequestSchema,
} from '@catering/shared-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { PaymentsService } from './payments.service.js';

@Controller()
@AccessScope('tenant')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('payments')
  async listPayments(
    @CurrentRequestContext() ctx: unknown,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = paymentFilterParamsSchema.parse({
      status: status || undefined,
      customerId: customerId || undefined,
      paymentMethod: paymentMethod || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: search || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return this.paymentsService.listPayments(tenantCtx.tenantId, parsed);
  }

  @Get('payments/stats')
  async getPaymentStats(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.paymentsService.getPaymentStats(tenantCtx.tenantId);
  }

  @Post('payments')
  async createPayment(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createPaymentRequestSchema.parse(body);
    return this.paymentsService.createPayment(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('payments/:id')
  async getPayment(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.paymentsService.getPayment(tenantCtx.tenantId, id);
  }

  @Post('payments/:id/allocations')
  async allocatePayment(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createPaymentAllocationsRequestSchema.parse(body);
    return this.paymentsService.allocatePayment(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Delete('payments/:id/allocations/:allocationId')
  async deallocatePayment(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Param('allocationId') allocationId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.paymentsService.deallocatePayment(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      allocationId,
    );
  }

  @Post('payments/:id/void')
  async voidPayment(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = voidPaymentRequestSchema.parse(body);
    return this.paymentsService.voidPayment(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }
}
