import { describe, expect, it } from 'vitest';

import { permissionsForRole } from './permission-map';

describe('permissionsForRole', () => {
  it('grants the owner all inventory and membership management permissions', () => {
    const permissions = permissionsForRole('OWNER');
    expect(permissions).toContain('members.manage');
    expect(permissions).toContain('inventory.manage');
  });

  it('does not allow a sales representative to manage vehicles or members', () => {
    const permissions = permissionsForRole('SALES_REPRESENTATIVE');
    expect(permissions).toContain('leads.manage');
    expect(permissions).not.toContain('vehicles.manage');
    expect(permissions).not.toContain('members.manage');
  });
});
