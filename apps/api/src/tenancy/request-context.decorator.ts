import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestContext } from '@catering/shared-types';
import type { RequestWithContext } from './request-context.types.js';

export const CurrentRequestContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestContext | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();

    return request.requestContext;
  },
);
