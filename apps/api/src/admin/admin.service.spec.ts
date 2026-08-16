import { describe, expect, it, vi } from 'vitest';

import { AdminService } from './admin.service';

describe('AdminService platform operations', () => {
  it('scopes tenant detail to the requested platform tenant id and rejects unknown tenants', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const service = new AdminService({ tenant: { findUnique } } as never);
    await expect(service.getTenant('tenant-b')).rejects.toMatchObject({ response: { code: 'TENANT_NOT_FOUND' } });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'tenant-b' } }));
  });

  it('records an audit event when approving a tenant', async () => {
    const tenantFindUnique = vi.fn().mockResolvedValue({ id: 'tenant-a', status: 'PENDING' });
    const tenantUpdate = vi.fn().mockResolvedValue({ id: 'tenant-a', name: 'معرض', status: 'ACTIVE', verificationStatus: 'APPROVED' });
    const auditCreate = vi.fn().mockResolvedValue({});
    const prisma = { tenant: { findUnique: tenantFindUnique }, $transaction: (callback: (tx: unknown) => unknown) => callback({ tenant: { update: tenantUpdate }, auditLog: { create: auditCreate } }) };
    const result = await new AdminService(prisma as never).decideTenant('tenant-a', 'approve', {}, 'admin-user');
    expect(result).toMatchObject({ status: 'ACTIVE' });
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: 'admin-user', action: 'TENANT_APPROVE', entityId: 'tenant-a' }) }));
  });

  it('rejects a manual plan expiration in the past', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'tenant-a', planCode: 'STARTER', subscriptionExpiresAt: null });
    await expect(new AdminService({ tenant: { findUnique } } as never).activatePlan('tenant-a', { planCode: 'PRO', expiresAt: '2020-01-01T00:00:00.000Z' }, 'admin-user')).rejects.toMatchObject({ response: { code: 'PLAN_EXPIRY_PAST' } });
  });
});
