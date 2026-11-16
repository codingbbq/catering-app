import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createPurchaseOrderRequestSchema,
  createSupplierRequestSchema,
  purchaseOrdersQuerySchema,
  receivePurchaseOrderItemsRequestSchema,
  supplierQuerySchema,
  updatePurchaseOrderRequestSchema,
  updateSupplierRequestSchema,
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
import { ProcurementService } from './procurement.service.js';

@Controller('suppliers')
@AccessScope('tenant')
export class SuppliersController {
  constructor(private readonly procurementService: ProcurementService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get()
  async listSuppliers(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = supplierQuerySchema.parse({
      search: search || undefined,
      includeArchived: includeArchived === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return this.procurementService.getSuppliers(tenantCtx.tenantId, parsed);
  }

  @Get(':id')
  async getSupplier(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.getSupplierById(tenantCtx.tenantId, id);
  }

  @Post()
  async createSupplier(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = createSupplierRequestSchema.parse(body);
    return this.procurementService.createSupplier(tenantCtx.tenantId, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Patch(':id')
  async updateSupplier(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = updateSupplierRequestSchema.parse(body);
    return this.procurementService.updateSupplier(tenantCtx.tenantId, id, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Post(':id/archive')
  async archiveSupplier(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.archiveSupplier(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }

  @Post(':id/restore')
  async restoreSupplier(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.restoreSupplier(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }
}

@Controller('purchase-orders')
@AccessScope('tenant')
export class PurchaseOrdersController {
  constructor(private readonly procurementService: ProcurementService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('summary')
  async getSummary(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.getSummary(tenantCtx.tenantId);
  }

  @Get()
  async listPurchaseOrders(
    @CurrentRequestContext() ctx: unknown,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = purchaseOrdersQuerySchema.parse({
      supplierId: supplierId || undefined,
      status: (status as any) || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return this.procurementService.getPurchaseOrders(tenantCtx.tenantId, parsed);
  }

  @Get(':id')
  async getPurchaseOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.getPurchaseOrderById(tenantCtx.tenantId, id);
  }

  @Post()
  async createPurchaseOrder(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = createPurchaseOrderRequestSchema.parse(body);
    return this.procurementService.createPurchaseOrder(tenantCtx.tenantId, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Patch(':id')
  async updatePurchaseOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = updatePurchaseOrderRequestSchema.parse(body);
    return this.procurementService.updatePurchaseOrder(tenantCtx.tenantId, id, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Post(':id/submit')
  async submitPurchaseOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.submitPurchaseOrder(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }

  @Post(':id/cancel')
  async cancelPurchaseOrder(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.procurementService.cancelPurchaseOrder(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }

  @Post(':id/receive')
  async receiveItems(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = receivePurchaseOrderItemsRequestSchema.parse(body);
    return this.procurementService.receiveItems(tenantCtx.tenantId, id, parsed, {
      id: tenantCtx.userId,
    });
  }
}
