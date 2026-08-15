import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import type { Permission, TenantContext } from './tenant-context';

type TenantRequest = FastifyRequest & { tenantContext?: TenantContext };

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!permission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.tenantContext?.permissions.has(permission)) {
      throw new ForbiddenException({ code: 'PERMISSION_DENIED', message: 'لا تملك الصلاحية المطلوبة لتنفيذ هذه العملية.' });
    }

    return true;
  }
}
