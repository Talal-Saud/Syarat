import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { rolePermissions, type PlatformPermission } from './platform-admin-permissions';
import { PlatformAdminGrantStatus } from '@syarat/database';
import type { FastifyRequest } from 'fastify';

import { AccessTokenGuard } from '../auth/access-token.guard';
import type { AccessTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

export type AdminRequest = FastifyRequest & { principal?: AccessTokenPayload; platformAdmin?: { role: string; permissions: readonly PlatformPermission[] } };

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
      select: { status: true, role: true, permissions: true }
    });
    if (!grant || grant.status !== PlatformAdminGrantStatus.ACTIVE) {
      throw new ForbiddenException({ code: 'PLATFORM_ADMIN_REQUIRED', message: 'لا تملك صلاحية إدارة المنصة.' });
    }

    request.platformAdmin = {
      role: grant.role,
      permissions: [...new Set([...(rolePermissions[grant.role] ?? []), ...grant.permissions])] as PlatformPermission[]
    };
    return true;
  }
}
