import type { Permission } from './tenant-context';

const permissionsByRole: Record<'OWNER' | 'MANAGER' | 'SALES_REPRESENTATIVE', readonly Permission[]> = {
  OWNER: [
    'tenant.read', 'tenant.update', 'branches.read', 'branches.manage', 'members.read', 'members.manage',
    'vehicles.read', 'vehicles.manage', 'inventory.manage', 'leads.read', 'leads.manage'
  ],
  MANAGER: [
    'tenant.read', 'branches.read', 'members.read', 'vehicles.read', 'vehicles.manage',
    'inventory.manage', 'leads.read', 'leads.manage'
  ],
  SALES_REPRESENTATIVE: ['tenant.read', 'branches.read', 'vehicles.read', 'leads.read', 'leads.manage']
};

export function permissionsForRole(role: keyof typeof permissionsByRole): ReadonlySet<Permission> {
  return new Set(permissionsByRole[role]);
}
