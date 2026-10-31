import { SetMetadata } from '@nestjs/common';
import type { AccessScope as AccessScopeValue } from '@catering/shared-types';

export const ACCESS_SCOPE_KEY = 'accessScope';

export function AccessScope(scope: AccessScopeValue) {
  return SetMetadata(ACCESS_SCOPE_KEY, scope);
}
