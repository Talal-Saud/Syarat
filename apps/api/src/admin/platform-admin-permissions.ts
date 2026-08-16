import { SetMetadata } from '@nestjs/common';

export const PLATFORM_PERMISSION_KEY = 'platform_permission';
export type PlatformPermission = 'tenants.read' | 'tenants.manage' | 'vehicles.moderate' | 'catalog.manage' | 'stats.read' | 'plans.manage' | 'audit.read';

export const RequirePlatformPermission = (permission: PlatformPermission) => SetMetadata(PLATFORM_PERMISSION_KEY, permission);

export const rolePermissions: Record<string, readonly PlatformPermission[]> = {
  SUPER_ADMIN: ['tenants.read', 'tenants.manage', 'vehicles.moderate', 'catalog.manage', 'stats.read', 'plans.manage', 'audit.read'],
  OPERATIONS: ['tenants.read', 'tenants.manage', 'audit.read'],
  MODERATION: ['tenants.read', 'vehicles.moderate'],
  CATALOG_MANAGER: ['catalog.manage'],
  ANALYST: ['stats.read', 'audit.read'],
  BILLING_MANAGER: ['tenants.read', 'plans.manage']
};
