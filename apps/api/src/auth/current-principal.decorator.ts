import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { type AccessTokenPayload } from './auth.types';

type AuthenticatedRequest = FastifyRequest & {
  principal?: AccessTokenPayload;
};

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessTokenPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.principal) {
      throw new Error('CurrentPrincipal used without AccessTokenGuard.');
    }
    return request.principal;
  }
);
