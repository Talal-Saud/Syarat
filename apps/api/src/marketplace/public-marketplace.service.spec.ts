import { describe, expect, it, vi } from 'vitest';

import { PublicMarketplaceService } from './public-marketplace.service';

const publicVehicle = {
  publicId: '11111111-1111-4111-8111-111111111111',
  year: 2025,
  condition: 'USED',
  price: { toString: () => '125000.00' },
  mileage: 20_000,
  transmission: 'AUTOMATIC',
  fuelType: 'GASOLINE',
  bodyType: 'SEDAN',
  description: 'وصف عام للمركبة',
  lastAvailabilityConfirmedAt: new Date('2026-08-15T12:00:00Z'),
  tenant: { name: 'معرض الرياض', slug: 'riyadh-dealer' },
  branch: { name: 'الفرع الرئيسي', city: { arabicName: 'الرياض', englishName: 'Riyadh', slug: 'riyadh' } },
  brand: { arabicName: 'تويوتا', englishName: 'Toyota', slug: 'toyota' },
  model: { arabicName: 'كامري', englishName: 'Camry', slug: 'camry' }
};

describe('PublicMarketplaceService', () => {
  it('يعيد Public DTO منفصلاً ولا يكشف tenant أو stock أو staff أو leads', async () => {
    const findFirst = vi.fn().mockResolvedValue(publicVehicle);
    const service = new PublicMarketplaceService(
      { vehicle: { findFirst } } as never,
      {} as never
    );

    const result = await service.getVehicle(publicVehicle.publicId);

    expect(result).toEqual({
      publicId: publicVehicle.publicId,
      year: 2025,
      condition: 'USED',
      price: '125000.00',
      mileage: 20_000,
      transmission: 'AUTOMATIC',
      fuel: 'GASOLINE',
      bodyType: 'SEDAN',
      description: 'وصف عام للمركبة',
      dealer: publicVehicle.tenant,
      city: publicVehicle.branch.city,
      branchName: 'الفرع الرئيسي',
      brand: publicVehicle.brand,
      model: publicVehicle.model,
      lastAvailabilityConfirmedAt: '2026-08-15T12:00:00.000Z'
    });
    expect(result).not.toHaveProperty('tenantId');
    expect(result).not.toHaveProperty('stockNumber');
    expect(result).not.toHaveProperty('staffId');
    expect(result).not.toHaveProperty('leads');
    expect(findFirst.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({
        publicationStatus: 'PUBLISHED',
        availabilityStatus: { in: ['AVAILABLE', 'RESERVED'] },
        tenant: { status: 'ACTIVE', verificationStatus: 'APPROVED' }
      })
    );
  });

  it('لا يعيد سيارة مباعة أو غير متاحة حتى لو عُرف publicId', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new PublicMarketplaceService(
      { vehicle: { findFirst } } as never,
      {} as never
    );

    await expect(service.getVehicle(publicVehicle.publicId)).rejects.toMatchObject({
      response: { code: 'PUBLIC_VEHICLE_NOT_FOUND' }
    });
  });
});
