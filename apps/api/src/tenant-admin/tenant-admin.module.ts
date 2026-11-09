import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module.js';
import { TenantAdminController } from './tenant-admin.controller.js';
import { TenantAdminService } from './tenant-admin.service.js';

@Module({
  imports: [TenancyModule],
  controllers: [TenantAdminController],
  providers: [TenantAdminService],
})
export class TenantAdminModule {}
