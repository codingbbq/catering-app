import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { assertTenantOwnership, resolveTenantRequestContext } from './tenant-context.utils.js';

describe('tenant-context.utils', () => {
  it('resolves tenant request context from headers', () => {
    expect(
      resolveTenantRequestContext({
        'x-tenant-id': '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f',
        'x-tenant-slug': 'demo-catering',
      }),
    ).toEqual({
      scope: 'tenant',
      tenantId: '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f',
      tenantSlug: 'demo-catering',
      tenantStatus: 'active',
    });
  });

  it('rejects suspended tenants', () => {
    expect(() =>
      resolveTenantRequestContext({
        'x-tenant-id': '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f',
        'x-tenant-status': 'suspended',
      }),
    ).toThrow(ForbiddenException);
  });

  it('rejects cross-tenant ownership checks', () => {
    expect(() =>
      assertTenantOwnership(
        {
          scope: 'tenant',
          tenantId: '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f',
          tenantStatus: 'active',
        },
        '11111111-1111-1111-1111-111111111111',
      ),
    ).toThrow(ForbiddenException);
  });
});
