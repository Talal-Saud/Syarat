export type Permission =
  | 'tenant.read'
  | 'tenant.update'
  | 'branches.read'
  | 'branches.manage'
  | 'members.read'
  | 'members.manage'
  | 'vehicles.read'
  | 'vehicles.manage'
  | 'inventory.manage'
  | 'leads.read'
  | 'leads.manage';

export type TenantContext = {
  kind: 'tenant';
  tenantId: string;
  userId: string;
  membershipId: string;
  role: 'OWNER' | 'MANAGER' | 'SALES_REPRESENTATIVE';
  permissions: ReadonlySet<Permission>;
  branchScope: { kind: 'all' } | { kind: 'limited'; branchIds: readonly string[] };
  correlationId: string;
};
