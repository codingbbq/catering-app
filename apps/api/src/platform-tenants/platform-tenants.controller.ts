import type { AuthenticatedPlatformContext, TenantLifecycleAction } from '@catering/shared-types';
import {
  createTenantRequestSchema,
  tenantLifecycleActionSchema,
  updateTenantRequestSchema,
} from '@catering/shared-types';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { CurrentRequestContext } from '../tenancy/request-context.decorator.js';
import { PlatformTenantsService } from './platform-tenants.service.js';

@Controller('platform/tenants')
@AccessScope('platform')
export class PlatformTenantsController {
  constructor(private readonly tenantsService: PlatformTenantsService) {}

  @Get()
  listTenants() {
    return this.tenantsService.listTenants();
  }

  @Post()
  createTenant(
    @Body() body: unknown,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ) {
    const dto = createTenantRequestSchema.parse(body);
    return this.tenantsService.createTenant(dto, ctx.userId);
  }

  @Get(':tenantId')
  getTenant(@Param('tenantId') tenantId: string) {
    return this.tenantsService.getTenant(tenantId);
  }

  @Patch(':tenantId')
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ) {
    const dto = updateTenantRequestSchema.parse(body);
    return this.tenantsService.updateTenant(tenantId, dto, ctx.userId);
  }

  @Post(':tenantId/activate')
  activateTenant(
    @Param('tenantId') tenantId: string,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ) {
    return this.tenantsService.performLifecycleAction(tenantId, 'activate', ctx.userId);
  }

  @Post(':tenantId/suspend')
  suspendTenant(
    @Param('tenantId') tenantId: string,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ) {
    return this.tenantsService.performLifecycleAction(tenantId, 'suspend', ctx.userId);
  }

  @Post(':tenantId/archive')
  archiveTenant(
    @Param('tenantId') tenantId: string,
    @CurrentRequestContext() ctx: AuthenticatedPlatformContext,
  ) {
    return this.tenantsService.performLifecycleAction(tenantId, 'archive', ctx.userId);
  }
}
