import type { AccessScope as AccessScopeValue, RequestContext } from '@catering/shared-types';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_SCOPE_KEY } from './access-scope.decorator.js';
import type { RequestWithContext } from './request-context.types.js';
import { resolveTenantRequestContext } from './tenant-context.utils.js';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<AccessScopeValue | undefined>(
      ACCESS_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();

    request.requestContext = this.resolveRequestContext(requiredScope, request.headers);

    return true;
  }

  private resolveRequestContext(
    requiredScope: AccessScopeValue,
    headers: RequestWithContext['headers'],
  ): RequestContext {
    if (requiredScope === 'platform') {
      return { scope: 'platform' };
    }

    return resolveTenantRequestContext(headers);
  }
}
