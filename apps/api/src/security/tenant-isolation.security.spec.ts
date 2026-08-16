import { describe, expect, it, vi } from 'vitest';

import { TenantContextService } from '../tenancy/tenant-context.service';
import { LeadsService } from '../leads/leads.service';

const tenantA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tenantB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const userA = '11111111-1111-4111-8111-111111111111';
const membershipA = '22222222-2222-4222-8222-222222222222';

describe('security tenant isolation', () => {
  it('rejects a membership selector that is not in the authenticated user membership set', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: membershipA, tenant: { id: tenantA }, branchScopeAll: true, branchScopes: [], role: 'OWNER', status: 'ACTIVE' }]);
    const service = new TenantContextService({ tenantMembership: { findMany } } as never);
    await expect(service.resolve({ userId: userA, membershipId: 'membership-b', correlationId: 'security-test' })).rejects.toMatchObject({ response: { code: 'TENANT_MEMBERSHIP_INVALID' } });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: userA }) }));
  });

  it('never queries a Lead using a tenant id supplied by an attacker', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new LeadsService({ lead: { findFirst } } as never, {} as never);
    await expect(service.get('lead-b', { kind: 'tenant', tenantId: tenantA, userId: userA, membershipId: membershipA, role: 'SALES_REPRESENTATIVE', branchScope: { kind: 'all' }, permissions: new Set(['leads.read']), correlationId: 'security-test' })).rejects.toMatchObject({ response: { code: 'LEAD_NOT_FOUND' } });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'lead-b', tenantId: tenantA }) }));
    expect(findFirst).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: tenantB }) }));
  });
});
