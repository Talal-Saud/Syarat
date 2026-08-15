import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PlatformAdminGrantStatus } from '@syarat/database';
import type { FastifyRequest } from 'fastify';

import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AccessTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

type AdminRequest = FastifyRequest & { principal?: AccessTokenPayload };

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await this.accessTokenGuard.canActivate(context);
    if (!allowed) {
      return false;
    }

    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (!request.principal || request.principal.kind !== 'staff') {
      throw new UnauthorizedException({ code: 'STAFF_SESSION_REQUIRED', message: 'يلزم تسجيل دخول موظف الإدارة.' });
    }

    const grant = await this.prisma.platformAdminGrant.findUnique({
      where: { userId: request.principal.sub },
      select: { status: true }
    });
    if (!grant || grant.status !== PlatformAdminGrantStatus.ACTIVE) {
      throw new ForbiddenException({ code: 'PLATFORM_ADMIN_REQUIRED', message: 'لا تملك صلاحية إدارة المنصة.' });
    }

    return true;
  }
}
