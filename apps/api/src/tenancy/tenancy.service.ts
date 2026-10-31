import type { PlatformRequestContext, RequestContext, TenantRequestContext } from '@catering/shared-types';
import { Injectable } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { assertTenantOwnership } from './tenant-context.utils.js';

@Injectable()
export class TenancyService {
  constructor(private readonly auditLogService: AuditLogService) {}

  getPlatformContextSummary(requestContext: PlatformRequestContext) {
    return {
      requestContext,
      routeScope: 'platform' as const,
      guardrail: 'Platform routes are separated from tenant routes.',
    };
  }

  getTenantContextSummary(requestContext: TenantRequestContext) {
    return {
      requestContext,
      routeScope: 'tenant' as const,
      guardrail: 'Tenant routes require an active tenant context.',
    };
  }

  verifyTenantOwnership(requestContext: RequestContext | undefined, requestedTenantId: string) {
    try {
      assertTenantOwnership(requestContext, requestedTenantId);
    } catch (error) {
      const tenantId = requestContext?.scope === 'tenant' ? requestContext.tenantId : undefined;

      this.auditLogService.record({
        scope: 'tenant',
        outcome: 'denied',
        action: 'tenant.ownership.verify',
        actorType: 'request',
        tenantId,
        reason: 'Tenant mismatch',
        metadata: {
          requestedTenantId,
        },
      });

      throw error;
    }

    this.auditLogService.record({
      scope: 'tenant',
      outcome: 'allowed',
      action: 'tenant.ownership.verify',
      actorType: 'request',
      tenantId: requestedTenantId,
    });

    return {
      ok: true,
      tenantId: requestedTenantId,
    };
  }
}
