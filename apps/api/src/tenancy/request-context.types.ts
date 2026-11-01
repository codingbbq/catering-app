import type { AuthenticatedRequestContext, RequestContext } from '@catering/shared-types';
import type { Request } from 'express';

export type RequestWithContext = Request & {
  requestContext?: RequestContext | AuthenticatedRequestContext;
};
