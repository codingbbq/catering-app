import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  createInventoryItemRequestSchema,
  inventoryQuerySchema,
  recordStockMovementRequestSchema,
  updateInventoryItemRequestSchema,
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
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
@AccessScope('tenant')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

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
    return this.inventoryService.getSummary(tenantCtx.tenantId);
  }

  @Get('items')
  async listItems(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('includeArchived') includeArchived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = inventoryQuerySchema.parse({
      search: search || undefined,
      category: category || undefined,
      status: status || undefined,
      includeArchived: includeArchived === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
    return this.inventoryService.getItems(tenantCtx.tenantId, parsed);
  }

  @Get('items/:id')
  async getItem(@CurrentRequestContext() ctx: unknown, @Param('id') id: string) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.inventoryService.getItemById(tenantCtx.tenantId, id);
  }

  @Post('items')
  async createItem(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = createInventoryItemRequestSchema.parse(body);
    return this.inventoryService.createItem(tenantCtx.tenantId, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Patch('items/:id')
  async updateItem(
    @CurrentRequestContext() ctx: unknown,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = updateInventoryItemRequestSchema.parse(body);
    return this.inventoryService.updateItem(tenantCtx.tenantId, id, parsed, {
      id: tenantCtx.userId,
    });
  }

  @Post('items/:id/archive')
  async archiveItem(@CurrentRequestContext() ctx: unknown, @Param('id') id: string) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.inventoryService.archiveItem(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }

  @Post('items/:id/restore')
  async restoreItem(@CurrentRequestContext() ctx: unknown, @Param('id') id: string) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.inventoryService.restoreItem(tenantCtx.tenantId, id, {
      id: tenantCtx.userId,
    });
  }

  @Get('movements')
  async listMovements(
    @CurrentRequestContext() ctx: unknown,
    @Query('inventoryItemId') inventoryItemId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.inventoryService.getMovements(tenantCtx.tenantId, {
      inventoryItemId: inventoryItemId || undefined,
      type: type || undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('movements')
  async recordMovement(@CurrentRequestContext() ctx: unknown, @Body() body: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = recordStockMovementRequestSchema.parse(body);
    return this.inventoryService.recordMovement(tenantCtx.tenantId, parsed, {
      id: tenantCtx.userId,
    });
  }
}
