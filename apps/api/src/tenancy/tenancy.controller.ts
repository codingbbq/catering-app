import type { PlatformRequestContext, TenantRequestContext } from '@catering/shared-types';
import { Controller, Get, Param } from '@nestjs/common';
import { AccessScope } from './access-scope.decorator.js';
import { CurrentRequestContext } from './request-context.decorator.js';
import { TenancyService } from './tenancy.service.js';

@Controller('platform/tenancy')
@AccessScope('platform')
export class PlatformTenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('context')
  getContext(@CurrentRequestContext() requestContext: PlatformRequestContext) {
    return this.tenancyService.getPlatformContextSummary(requestContext);
  }
}

@Controller('tenant/tenancy')
@AccessScope('tenant')
export class TenantTenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('context')
  getContext(@CurrentRequestContext() requestContext: TenantRequestContext) {
    return this.tenancyService.getTenantContextSummary(requestContext);
  }

  @Get('ownership/:tenantId')
  verifyTenantOwnership(
    @CurrentRequestContext() requestContext: TenantRequestContext,
    @Param('tenantId') tenantId: string,
  ) {
    return this.tenancyService.verifyTenantOwnership(requestContext, tenantId);
  }
}
