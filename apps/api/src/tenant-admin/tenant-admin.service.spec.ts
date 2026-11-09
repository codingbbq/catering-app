import { describe, expect, it } from 'vitest';
import type { TenantRole } from '@catering/shared-types';

const ADMIN_ROLES: ReadonlySet<TenantRole> = new Set(['owner', 'admin']);

describe('TenantAdminService — role policies', () => {
  it('owner and admin are considered admin roles', () => {
    expect(ADMIN_ROLES.has('owner')).toBe(true);
    expect(ADMIN_ROLES.has('admin')).toBe(true);
  });

  it('manager and staff are not admin roles', () => {
    expect(ADMIN_ROLES.has('manager')).toBe(false);
    expect(ADMIN_ROLES.has('staff')).toBe(false);
  });

  it('only owner can promote to owner', () => {
    const canPromote = (actorRole: TenantRole, targetRole: TenantRole) =>
      targetRole !== 'owner' || actorRole === 'owner';

    expect(canPromote('owner', 'owner')).toBe(true);
    expect(canPromote('admin', 'owner')).toBe(false);
    expect(canPromote('manager', 'owner')).toBe(false);
    expect(canPromote('staff', 'owner')).toBe(false);
  });

  it('only owner can change another owner role', () => {
    const canChangeOwner = (actorRole: TenantRole) => actorRole === 'owner';

    expect(canChangeOwner('owner')).toBe(true);
    expect(canChangeOwner('admin')).toBe(false);
  });

  it('admin can change non-owner roles', () => {
    const canChange = (actorRole: TenantRole, targetRole: TenantRole) =>
      ADMIN_ROLES.has(actorRole) && (targetRole !== 'owner' || actorRole === 'owner');

    expect(canChange('admin', 'staff')).toBe(true);
    expect(canChange('admin', 'manager')).toBe(true);
    expect(canChange('admin', 'admin')).toBe(true);
    expect(canChange('admin', 'owner')).toBe(false);
  });
});
