import { describe, expect, it, vi } from 'vitest';

import { LeadsService } from './leads.service';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';
const context = { kind: 'tenant' as const, tenantId: tenantA, userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', membershipId: '33333333-3333-4333-8333-333333333333', role: 'SALES_REPRESENTATIVE' as const, branchScope: { kind: 'limited' as const, branchIds: ['44444444-4444-4444-8444-444444444444'] }, permissions: new Set(['leads.read', 'leads.manage'] as const), correlationId: 'test-correlation' };
const environment = { OTP_HMAC_SECRET: 'test-secret' } as never;

function createService(prisma: Record<string, unknown>) { return new LeadsService(prisma as never, environment); }

describe('LeadsService tenant-safe CRM', () => {
  it('SalesEmployee sees only leads in the active tenant and permitted branch scope', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await createService({ lead: { findMany } }).list(context);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: tenantA, branchId: { in: context.branchScope.branchIds } } }));
    expect(findMany).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: tenantB }) }));
  });

  it('cannot read a Lead owned by another tenant', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(createService({ lead: { findFirst } }).get('lead-b', context)).rejects.toMatchObject({ response: { code: 'LEAD_NOT_FOUND' } });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'lead-b', tenantId: tenantA, branchId: { in: context.branchScope.branchIds } } }));
  });

  it('cannot change a Lead owned by another tenant', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(createService({ lead: { findFirst } }).update('lead-b', { status: 'CONTACTED' }, context)).rejects.toMatchObject({ response: { code: 'LEAD_NOT_FOUND' } });
  });

  it('rejects quote requests for sold vehicles', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'vehicle-1', tenantId: tenantA, branchId: 'branch-1', availabilityStatus: 'SOLD' });
    await expect(createService({ vehicle: { findFirst } }).createQuoteRequest('public-vehicle-1', { name: 'عميل', phone: '0551234567' }, 'customer-1')).rejects.toMatchObject({ response: { code: 'SOLD_VEHICLE' } });
  });

  it('deduplicates a recent request for the same customer and vehicle', async () => {
    const vehicleFindFirst = vi.fn().mockResolvedValue({ id: 'vehicle-1', tenantId: tenantA, branchId: 'branch-1', availabilityStatus: 'AVAILABLE' });
    const leadFindFirst = vi.fn().mockResolvedValue({ id: 'lead-existing', status: 'NEW' });
    const service = createService({ vehicle: { findFirst: vehicleFindFirst }, lead: { findFirst: leadFindFirst } });
    await expect(service.createQuoteRequest('public-vehicle-1', { name: 'عميل', phone: '0551234567' }, 'customer-1')).resolves.toMatchObject({ deduplicated: true, leadId: 'lead-existing' });
    expect(leadFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: tenantA, vehicleId: 'vehicle-1', customerUserId: 'customer-1' }) }));
  });
});
