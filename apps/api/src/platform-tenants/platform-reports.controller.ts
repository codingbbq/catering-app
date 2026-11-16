import { Controller, Get } from '@nestjs/common';
import { AccessScope } from '../tenancy/access-scope.decorator.js';
import { PlatformTenantsService } from './platform-tenants.service.js';

@Controller('platform/reports')
@AccessScope('platform')
export class PlatformReportsController {
  constructor(private readonly tenantsService: PlatformTenantsService) {}

  @Get('tenant-summary')
  async getTenantSummary() {
    return this.tenantsService.getPlatformTenantSummary();
  }
}
