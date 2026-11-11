import type { AuthenticatedTenantContext } from '@catering/shared-types';
import {
  catalogueImportRequestSchema,
  catalogueSearchParamsSchema,
  createCatalogueItemRequestSchema,
  updateCatalogueItemRequestSchema,
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
import { CatalogueService } from './catalogue.service.js';

@Controller()
@AccessScope('tenant')
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  private getTenantContext(ctx: unknown): AuthenticatedTenantContext {
    const tenantCtx = ctx as AuthenticatedTenantContext;
    if (tenantCtx.scope !== 'tenant' || !tenantCtx.tenantId) {
      throw new Error('Invalid tenant context');
    }
    return tenantCtx;
  }

  @Get('catalogue-items')
  async listItems(
    @CurrentRequestContext() ctx: unknown,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'active' | 'archived' | 'all',
    @Query('dietaryTag') dietaryTag?: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const parsed = catalogueSearchParamsSchema.parse({
      search,
      category,
      status,
      dietaryTag,
    });
    return this.catalogueService.listItems(tenantCtx.tenantId, parsed);
  }

  @Post('catalogue-items')
  async createItem(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = createCatalogueItemRequestSchema.parse(body);
    return this.catalogueService.createItem(
      tenantCtx.tenantId,
      tenantCtx.userId,
      dto,
    );
  }

  @Get('catalogue-items/:itemId')
  async getItem(
    @CurrentRequestContext() ctx: unknown,
    @Param('itemId') itemId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.catalogueService.getItemById(tenantCtx.tenantId, itemId);
  }

  @Patch('catalogue-items/:itemId')
  async updateItem(
    @CurrentRequestContext() ctx: unknown,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const dto = updateCatalogueItemRequestSchema.parse(body);
    return this.catalogueService.updateItem(
      tenantCtx.tenantId,
      tenantCtx.userId,
      itemId,
      dto,
    );
  }

  @Post('catalogue-items/:itemId/archive')
  async archiveItem(
    @CurrentRequestContext() ctx: unknown,
    @Param('itemId') itemId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.catalogueService.toggleArchive(
      tenantCtx.tenantId,
      tenantCtx.userId,
      itemId,
      true,
    );
  }

  @Post('catalogue-items/:itemId/reactivate')
  async reactivateItem(
    @CurrentRequestContext() ctx: unknown,
    @Param('itemId') itemId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.catalogueService.toggleArchive(
      tenantCtx.tenantId,
      tenantCtx.userId,
      itemId,
      false,
    );
  }

  @Post('catalogue-imports')
  async importCatalogue(
    @CurrentRequestContext() ctx: unknown,
    @Body() body: unknown,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    const req = catalogueImportRequestSchema.parse(body);
    return this.catalogueService.importCatalogue(
      tenantCtx.tenantId,
      tenantCtx.userId,
      req,
    );
  }

  @Get('catalogue-imports')
  async getImportJobs(@CurrentRequestContext() ctx: unknown) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.catalogueService.getImportJobs(tenantCtx.tenantId);
  }

  @Get('catalogue-imports/:jobId')
  async getImportJob(
    @CurrentRequestContext() ctx: unknown,
    @Param('jobId') jobId: string,
  ) {
    const tenantCtx = this.getTenantContext(ctx);
    return this.catalogueService.getImportJobById(tenantCtx.tenantId, jobId);
  }
}
