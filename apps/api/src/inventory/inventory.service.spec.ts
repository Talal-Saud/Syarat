import { describe, expect, it, vi } from 'vitest';
import { AvailabilityStatus, PublicationStatus, ReservationStatus } from '@syarat/database';
import { InventoryService } from './inventory.service';

const context = { tenantId: '11111111-1111-4111-8111-111111111111', membershipId: '22222222-2222-4222-8222-222222222222', branchScope: { kind: 'all' as const }, permissions: ['inventory.manage'] as const };

describe('InventoryService reservations', () => {
  it('uses a serializable transaction and TenantContext tenant when creating a reservation', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333', publicationStatus: PublicationStatus.PUBLISHED, availabilityStatus: AvailabilityStatus.AVAILABLE });
    const create = vi.fn().mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444', status: ReservationStatus.ACTIVE, vehicleId: '33333333-3333-4333-8333-333333333333' });
    const tx = { vehicle: { findFirst, update: vi.fn() }, reservation: { findFirst: vi.fn().mockResolvedValue(null), create }, vehicleStatusHistory: { create: vi.fn() } };
    const $transaction = vi.fn(async (operation: (value: typeof tx) => Promise<unknown>, options: unknown) => { expect(options).toEqual(expect.objectContaining({ isolationLevel: 'Serializable' })); return operation(tx); });
    const service = new InventoryService({ $transaction } as never);
    await service.reserve(context, '33333333-3333-4333-8333-333333333333');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: context.tenantId }) }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: context.tenantId, vehicleId: '33333333-3333-4333-8333-333333333333' }) }));
  });
});
