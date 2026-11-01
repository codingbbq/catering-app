import type { AccessScope, PlatformRole, TenantRole } from '@catering/shared-types';

export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
  scope: AccessScope;
  role: PlatformRole | TenantRole;
  tenantId?: string;
  tenantSlug?: string;
  tenantStatus?: string;
}
