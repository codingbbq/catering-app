import type { AccessScope as AccessScopeValue } from '@catering/shared-types';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACCESS_SCOPE_KEY } from '../tenancy/access-scope.decorator.js';
import type { RequestWithContext } from '../tenancy/request-context.types.js';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<AccessScopeValue | undefined>(
      ACCESS_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredScope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required.');
    }

    const token = authHeader.slice(7);
    const payload = this.authService.verifyAccessToken(token);

    if (payload.scope !== requiredScope) {
      throw new UnauthorizedException(`This endpoint requires ${requiredScope} access.`);
    }

    request.requestContext = this.authService.buildAuthenticatedContext(payload);

    return true;
  }
}
