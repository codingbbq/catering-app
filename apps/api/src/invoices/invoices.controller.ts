import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createInvoiceFromBookingRequestSchema,
  createInvoiceRequestSchema,
  invoiceFilterParamsSchema,
  recordInvoicePaymentSchema,
  updateInvoiceRequestSchema,
  voidInvoiceRequestSchema,
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
import { InvoicesService } from './invoices.service.js';

@Controller()
@AccessScope('tenant')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('invoices')
  async listInvoices(
    @CurrentRequestContext() ctx: unknown,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('bookingId') bookingId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = invoiceFilterParamsSchema.parse({
      status: status || undefined,
      customerId: customerId || undefined,
      bookingId: bookingId || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      search: search || undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return this.invoicesService.listInvoices(tenantCtx.tenantId, parsed);
  }

  @Post('invoices')
  async createInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createInvoiceRequestSchema.parse(body);
    return this.invoicesService.createInvoice(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Post('invoices/from-booking')
  async createInvoiceFromBooking(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createInvoiceFromBookingRequestSchema.parse(body);
    return this.invoicesService.createInvoiceFromBooking(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('invoices/:id')
  async getInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.invoicesService.getInvoice(tenantCtx.tenantId, id);
  }

  @Patch('invoices/:id')
  async updateInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateInvoiceRequestSchema.parse(body);
    return this.invoicesService.updateInvoice(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Post('invoices/:id/issue')
  async issueInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.invoicesService.issueInvoice(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
    );
  }

  @Post('invoices/:id/payments')
  async recordPayment(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = recordInvoicePaymentSchema.parse(body);
    return this.invoicesService.recordPayment(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Post('invoices/:id/void')
  async voidInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = voidInvoiceRequestSchema.parse(body);
    return this.invoicesService.voidInvoice(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
      dto,
    );
  }

  @Delete('invoices/:id')
  async deleteDraftInvoice(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.invoicesService.deleteDraftInvoice(
      tenantCtx.tenantId,
      tenantCtx.userId,
      id,
    );
  }
}
