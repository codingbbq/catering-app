import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogService } from './audit-log.service.js';
import { RequestContextInterceptor } from './request-context.interceptor.js';
import { PlatformTenancyController, TenantTenancyController } from './tenancy.controller.js';
import { TenantContextGuard } from './tenant-context.guard.js';
import { TenancyService } from './tenancy.service.js';

@Module({
  controllers: [PlatformTenancyController, TenantTenancyController],
  providers: [
    AuditLogService,
    TenancyService,
    {
      provide: APP_GUARD,
      useClass: TenantContextGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
  exports: [AuditLogService, TenancyService],
})
export class TenancyModule {}
