import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AccessTokenPayload } from '../auth/auth.types';
import { TenantContextService } from './tenant-context.service';
import type { TenantContext } from './tenant-context';

type TenantRequest = FastifyRequest & {
  principal?: AccessTokenPayload;
  tenantContext?: TenantContext;
};

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly tenantContextService: TenantContextService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await this.accessTokenGuard.canActivate(context);
    if (!allowed) {
      return false;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.principal || request.principal.kind !== 'staff') {
      throw new UnauthorizedException({ code: 'STAFF_SESSION_REQUIRED', message: 'يلزم تسجيل دخول موظف المعرض.' });
    }

    const membershipHeader = request.headers['x-membership-id'];
    const membershipId = typeof membershipHeader === 'string' ? membershipHeader : undefined;
    const requestId = request.headers['x-request-id'];
    const correlationId = typeof requestId === 'string' ? requestId : 'unknown';

    request.tenantContext = await this.tenantContextService.resolve({
      userId: request.principal.sub,
      membershipId,
      correlationId
    });
    return true;
  }
}
