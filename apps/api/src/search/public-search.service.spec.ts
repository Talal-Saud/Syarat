import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';

import { PublicVehicleSort, type PublicVehicleSearchDto } from './dto/public-search.dto';
import { PostgresPublicSearchService } from './public-search.service';

const baseFilters: PublicVehicleSearchDto = {
  sort: PublicVehicleSort.Newest,
  limit: 20
};

describe('PostgresPublicSearchService', () => {
  it('يطبق أهلية Tenant والسيارة وفلتر المدينة والبحث العربي عبر aliases', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new PostgresPublicSearchService({ vehicle: { findMany } } as never);

    await service.search({ ...baseFilters, city: 'الرياض', brand: 'تويوتا', model: 'كامري' });

    const call = findMany.mock.calls[0]?.[0];
    expect(call.where).toEqual(
      expect.objectContaining({
        publicationStatus: 'PUBLISHED',
        availabilityStatus: { in: ['AVAILABLE', 'RESERVED'] },
        tenant: { status: 'ACTIVE', verificationStatus: 'APPROVED' },
        branch: expect.objectContaining({ city: expect.objectContaining({ OR: expect.any(Array) }) }),
        brand: expect.objectContaining({ OR: expect.any(Array) }),
        model: expect.objectContaining({ OR: expect.any(Array) })
      })
    );
    expect(call.select).not.toHaveProperty('tenantId');
    expect(call.select).not.toHaveProperty('stockNumber');
    expect(call.select).not.toHaveProperty('leads');
  });

  it('يطبق تركيب فلاتر السنة والسعر والممشى والوقود وناقل الحركة', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new PostgresPublicSearchService({ vehicle: { findMany } } as never);

    await service.search({
      ...baseFilters,
      minYear: 2020,
      maxYear: 2025,
      minPrice: 50_000,
      maxPrice: 200_000,
      minMileage: 1_000,
      maxMileage: 100_000,
      transmission: 'AUTOMATIC',
      fuel: 'HYBRID'
    });

    expect(findMany.mock.calls[0]?.[0].where).toEqual(
      expect.objectContaining({
        year: { gte: 2020, lte: 2025 },
        price: { gte: 50_000, lte: 200_000 },
        mileage: { gte: 1_000, lte: 100_000 },
        transmission: 'AUTOMATIC',
        fuelType: 'HYBRID'
      })
    );
  });

  it('يرفض نطاق السعر غير الصحيح ومؤشر الصفحة غير المتوافق مع الفرز', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new PostgresPublicSearchService({ vehicle: { findMany } } as never);

    await expect(service.search({ ...baseFilters, minPrice: 200, maxPrice: 100 })).rejects.toMatchObject({
      response: { code: 'PUBLIC_PRICE_RANGE_INVALID' }
    });
    await expect(service.search({ ...baseFilters, cursor: 'not-a-valid-cursor' })).rejects.toMatchObject({
      response: { code: 'PUBLIC_CURSOR_INVALID' }
    });
  });

  it('يطبق limit + 1 ويصدر nextCursor عند وجود صفحة لاحقة', async () => {
    const records = Array.from({ length: 3 }, (_, index) => ({
      publicId: `00000000-0000-4000-8000-00000000000${index + 1}`,
      year: 2025,
      condition: 'USED',
      price: { toString: () => String(100_000 + index) },
      mileage: 10_000 + index,
      transmission: 'AUTOMATIC',
      fuelType: 'GASOLINE',
      bodyType: 'SEDAN',
      description: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      lastAvailabilityConfirmedAt: null,
      tenant: { name: 'معرض', slug: 'dealer' },
      branch: { name: 'الرئيسي', city: { arabicName: 'الرياض', englishName: 'Riyadh', slug: 'riyadh' } },
      brand: { arabicName: 'تويوتا', englishName: 'Toyota', slug: 'toyota' },
      model: { arabicName: 'كامري', englishName: 'Camry', slug: 'camry' }
    }));
    const findMany = vi.fn().mockResolvedValue(records);
    const service = new PostgresPublicSearchService({ vehicle: { findMany } } as never);

    const result = await service.search({ ...baseFilters, limit: 2, sort: PublicVehicleSort.LowestPrice });
    expect(findMany.mock.calls[0]?.[0].take).toBe(3);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.nextCursor).toEqual(expect.any(String));
  });
});
