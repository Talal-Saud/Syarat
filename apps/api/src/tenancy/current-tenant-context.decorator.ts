import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { TenantContext } from './tenant-context';

type TenantRequest = FastifyRequest & { tenantContext?: TenantContext };

export const CurrentTenantContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenantContext) {
      throw new Error('CurrentTenantContext used without TenantContextGuard.');
    }
    return request.tenantContext;
  }
);
