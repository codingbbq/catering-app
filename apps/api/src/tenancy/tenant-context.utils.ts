import {
  type RequestContext,
  tenantContextHeadersSchema,
  type TenantRequestContext,
} from '@catering/shared-types';
import { ForbiddenException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';

export function resolveTenantRequestContext(headers: IncomingHttpHeaders): TenantRequestContext {
  const result = tenantContextHeadersSchema.safeParse({
    'x-tenant-id': headers['x-tenant-id'],
    'x-tenant-slug': headers['x-tenant-slug'],
    'x-tenant-status': headers['x-tenant-status'] ?? 'active',
  });

  if (!result.success) {
    throw new ForbiddenException('Tenant context is required for tenant-scoped access.');
  }

  const {
    'x-tenant-id': tenantId,
    'x-tenant-slug': tenantSlug,
    'x-tenant-status': parsedTenantStatus,
  } = result.data;
  const tenantStatus = parsedTenantStatus ?? 'active';

  if (tenantStatus === 'suspended' || tenantStatus === 'archived') {
    throw new ForbiddenException('Tenant access is not allowed for the current tenant status.');
  }

  return {
    scope: 'tenant',
    tenantId,
    tenantSlug,
    tenantStatus,
  };
}

export function assertTenantContext(
  requestContext: RequestContext | undefined,
): asserts requestContext is TenantRequestContext {
  if (!requestContext || requestContext.scope !== 'tenant') {
    throw new ForbiddenException('Tenant-scoped access requires an active tenant context.');
  }
}

export function assertTenantOwnership(requestContext: RequestContext | undefined, tenantId: string): void {
  assertTenantContext(requestContext);

  if (requestContext.tenantId !== tenantId) {
    throw new ForbiddenException('Cross-tenant access was rejected.');
  }
}
