import { describe, expect, it, vi } from 'vitest';
import { AvailabilityStatus, PublicationStatus, ReservationStatus } from '@syarat/database';
import { InventoryService } from './inventory.service';

const context = { kind: 'tenant' as const, tenantId: '11111111-1111-4111-8111-111111111111', userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', membershipId: '22222222-2222-4222-8222-222222222222', role: 'OWNER' as const, branchScope: { kind: 'all' as const }, permissions: new Set(['inventory.manage'] as const), correlationId: 'test-correlation' };

describe('InventoryService reservations', () => {
  it('propagates the database uniqueness race so only one reservation can win', async () => {
    const reservationCreate = vi.fn().mockResolvedValueOnce({ id: 'r1', status: ReservationStatus.ACTIVE, vehicleId: 'v1' }).mockRejectedValueOnce(new Error('P2002 unique active reservation'));
    const tx = { vehicle: { findFirst: vi.fn().mockResolvedValue({ id: 'v1', publicationStatus: PublicationStatus.PUBLISHED, availabilityStatus: AvailabilityStatus.AVAILABLE }), update: vi.fn() }, reservation: { findFirst: vi.fn().mockResolvedValue(null), create: reservationCreate }, vehicleStatusHistory: { create: vi.fn() } };
    const $transaction = vi.fn(async (operation: (value: typeof tx) => Promise<unknown>) => operation(tx));
    const service = new InventoryService({ $transaction } as never);
    const results = await Promise.allSettled([service.reserve(context, 'v1'), service.reserve(context, 'v1')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

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
