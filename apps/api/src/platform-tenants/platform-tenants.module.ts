import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { PlatformReportsController } from './platform-reports.controller.js';
import { PlatformTenantsController } from './platform-tenants.controller.js';
import { PlatformTenantsService } from './platform-tenants.service.js';

@Module({
  imports: [TenancyModule],
  controllers: [PlatformTenantsController, PlatformReportsController],
  providers: [PlatformTenantsService],
})
export class PlatformTenantsModule {}
