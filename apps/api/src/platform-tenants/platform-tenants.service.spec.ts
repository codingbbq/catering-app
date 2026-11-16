import { describe, expect, it } from 'vitest';
import { PlatformTenantsService } from './platform-tenants.service.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  onboarding: ['active', 'archived'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

describe('Tenant lifecycle transitions', () => {
  it('onboarding -> active is allowed', () => {
    expect(VALID_TRANSITIONS['onboarding']).toContain('active');
  });

  it('onboarding -> suspended is not allowed', () => {
    expect(VALID_TRANSITIONS['onboarding']).not.toContain('suspended');
  });

  it('active -> suspended is allowed', () => {
    expect(VALID_TRANSITIONS['active']).toContain('suspended');
  });

  it('active -> archived is allowed', () => {
    expect(VALID_TRANSITIONS['active']).toContain('archived');
  });

  it('suspended -> active is allowed (reactivation)', () => {
    expect(VALID_TRANSITIONS['suspended']).toContain('active');
  });

  it('suspended -> archived is allowed', () => {
    expect(VALID_TRANSITIONS['suspended']).toContain('archived');
  });

  it('archived has no valid transitions', () => {
    expect(VALID_TRANSITIONS['archived']).toHaveLength(0);
  });

  it('aggregates platform tenant oversight metrics correctly', async () => {
    const mockPrisma = {
      tenant: {
        findMany: () =>
          Promise.resolve([
            {
              id: '00000000-0000-0000-0000-000000000001',
              displayName: 'Apex Catering',
              slug: 'apex-catering',
              status: 'active',
              createdAt: new Date('2026-01-01'),
              _count: { users: 5, bookings: 12, invoices: 10 },
            },
            {
              id: '00000000-0000-0000-0000-000000000002',
              displayName: 'Beta Catering',
              slug: 'beta-catering',
              status: 'suspended',
              createdAt: new Date('2026-02-01'),
              _count: { users: 2, bookings: 3, invoices: 2 },
            },
          ]),
      },
      platformUser: {
        count: () => Promise.resolve(2),
      },
      catalogueItem: {
        count: () => Promise.resolve(80),
      },
    };

    const mockAuditLogService = { record: () => {} };
    const service = new PlatformTenantsService(mockPrisma as any, mockAuditLogService as any);

    const summary = await service.getPlatformTenantSummary();

    expect(summary.totalTenants).toBe(2);
    expect(summary.tenantsByStatus.active).toBe(1);
    expect(summary.tenantsByStatus.suspended).toBe(1);
    expect(summary.totalTenantUsers).toBe(7);
    expect(summary.totalBookingsCount).toBe(15);
    expect(summary.totalInvoicesCount).toBe(12);
    expect(summary.totalPlatformUsers).toBe(2);
    expect(summary.totalCatalogueItemsCount).toBe(80);
    expect(summary.tenantActivity).toHaveLength(2);
  });
});
