import { describe, expect, it, vi } from 'vitest';
import { VehiclesService } from './vehicles.service';

const context = { tenantId: '11111111-1111-4111-8111-111111111111', membershipId: '22222222-2222-4222-8222-222222222222', branchScope: { kind: 'all' as const }, permissions: ['vehicles.read', 'vehicles.manage'] as const };

describe('VehiclesService tenant isolation', () => {
  it('scopes a detail lookup to the TenantContext tenant rather than any route identifier', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new VehiclesService({ vehicle: { findFirst }, branch: {}, vehicleModel: {} } as never);
    await expect(service.get(context, '33333333-3333-4333-8333-333333333333')).rejects.toMatchObject({ response: { code: 'VEHICLE_NOT_FOUND' } });
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: context.tenantId }) }));
  });

  it('scopes the vehicle list to TenantContext even when the caller supplies no tenant filter', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new VehiclesService({ vehicle: { findMany }, branch: {}, vehicleModel: {} } as never);
    await service.list(context);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: context.tenantId }) }));
  });
});
