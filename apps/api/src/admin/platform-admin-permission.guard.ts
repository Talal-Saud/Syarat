import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PLATFORM_PERMISSION_KEY, type PlatformPermission } from './platform-admin-permissions';
import { type AdminRequest } from './platform-admin.guard';

@Injectable()
export class PlatformAdminPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PlatformPermission>(PLATFORM_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (!request.platformAdmin?.permissions.includes(required)) throw new ForbiddenException({ code: 'PLATFORM_PERMISSION_DENIED', message: 'لا تملك صلاحية تنفيذ هذا الإجراء الإداري.' });
    return true;
  }
}
