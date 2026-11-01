import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogService } from './audit-log.service.js';
import { RequestContextInterceptor } from './request-context.interceptor.js';
import { PlatformTenancyController, TenantTenancyController } from './tenancy.controller.js';
import { TenancyService } from './tenancy.service.js';

@Module({
  controllers: [PlatformTenancyController, TenantTenancyController],
  providers: [
    AuditLogService,
    TenancyService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
  exports: [AuditLogService, TenancyService],
})
export class TenancyModule {}
