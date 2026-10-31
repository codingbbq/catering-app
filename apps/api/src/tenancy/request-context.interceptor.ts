import type { RequestWithContext } from './request-context.types.js';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const requestContext = request.requestContext;

    if (requestContext) {
      response.setHeader('x-access-scope', requestContext.scope);

      if (requestContext.scope === 'tenant') {
        response.setHeader('x-tenant-id', requestContext.tenantId);
      }
    }

    return next.handle();
  }
}
