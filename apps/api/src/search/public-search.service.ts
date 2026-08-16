import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PublicationStatus, AvailabilityStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import {
  PublicVehicleSearchDto,
  PublicVehicleSort,
  type PublicPageInfo
} from './dto/public-search.dto';

export type PublicVehicleRecord = {
  publicId: string;
  year: number;
  condition: string;
  price: Prisma.Decimal;
  mileage: number | null;
  transmission: string;
  fuelType: string;
  bodyType: string;
  description: string | null;
  createdAt: Date;
  lastAvailabilityConfirmedAt: Date | null;
  tenant: { name: string; slug: string };
  branch: { name: string; city: { arabicName: string; englishName: string | null; slug: string } };
  brand: { arabicName: string; englishName: string | null; slug: string };
  model: { arabicName: string; englishName: string | null; slug: string };
};

export type PublicSearchResult = {
  records: PublicVehicleRecord[];
  pageInfo: PublicPageInfo;
};

export interface PublicSearchPort {
  search(filters: PublicVehicleSearchDto): Promise<PublicSearchResult>;
}

const publicVehicleSelect = {
  publicId: true,
  year: true,
  condition: true,
  price: true,
  mileage: true,
  transmission: true,
  fuelType: true,
  bodyType: true,
  description: true,
  createdAt: true,
  lastAvailabilityConfirmedAt: true,
  tenant: { select: { name: true, slug: true } },
  branch: {
    select: {
      name: true,
      city: { select: { arabicName: true, englishName: true, slug: true } }
    }
  },
  brand: { select: { arabicName: true, englishName: true, slug: true } },
  model: { select: { arabicName: true, englishName: true, slug: true } }
} satisfies Prisma.VehicleSelect;

@Injectable()
export class PostgresPublicSearchService implements PublicSearchPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: PublicVehicleSearchDto): Promise<PublicSearchResult> {
    this.assertRanges(filters);
    const cursor = this.decodeCursor(filters.cursor, filters.sort);
    const where: Prisma.VehicleWhereInput = {
      publicationStatus: PublicationStatus.PUBLISHED,
      availabilityStatus: { in: [AvailabilityStatus.AVAILABLE, AvailabilityStatus.RESERVED] },
      tenant: { status: 'ACTIVE', verificationStatus: 'APPROVED' },
      branch: { city: { isActive: true } },
      ...(filters.condition ? { condition: filters.condition } : {}),
      ...(filters.minYear !== undefined || filters.maxYear !== undefined
        ? { year: { ...(filters.minYear !== undefined ? { gte: filters.minYear } : {}), ...(filters.maxYear !== undefined ? { lte: filters.maxYear } : {}) } }
        : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? { price: { ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}), ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}) } }
        : {}),
      ...(filters.minMileage !== undefined || filters.maxMileage !== undefined
        ? { mileage: { ...(filters.minMileage !== undefined ? { gte: filters.minMileage } : {}), ...(filters.maxMileage !== undefined ? { lte: filters.maxMileage } : {}) } }
        : {}),
      ...(filters.transmission ? { transmission: filters.transmission } : {}),
      ...(filters.fuel ? { fuelType: filters.fuel } : {}),
      ...(filters.bodyType ? { bodyType: filters.bodyType as never } : {}),
      ...(filters.city ? { branch: { city: this.catalogPredicate(filters.city) as Prisma.CityWhereInput } } : {}),
      ...(filters.brand ? { brand: this.catalogPredicate(filters.brand) } : {}),
      ...(filters.model ? { model: this.catalogPredicate(filters.model) as Prisma.VehicleModelWhereInput } : {}),
      ...(filters.q ? { OR: this.freeTextSearch(filters.q) } : {}),
      ...(cursor ? { AND: [this.cursorPredicate(filters.sort, cursor)] } : {})
    };

    const orderBy = this.orderBy(filters.sort);
    const records = await this.prisma.vehicle.findMany({
      where,
      select: publicVehicleSelect,
      orderBy,
      take: filters.limit + 1
    });
    const hasNextPage = records.length > filters.limit;
    const pageRecords = hasNextPage ? records.slice(0, filters.limit) : records;
    const last = pageRecords[pageRecords.length - 1];
    return {
      records: pageRecords,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage && last ? this.encodeCursor(filters.sort, last) : null
      }
    };
  }

  private catalogPredicate(value: string): Prisma.BrandWhereInput {
    if (this.isUuid(value)) return { id: value };
    return { OR: this.namePredicates(value) as Prisma.BrandWhereInput[] };
  }

  private freeTextSearch(value: string): Prisma.VehicleWhereInput[] {
    const predicates = this.namePredicates(value);
    return [
      ...predicates.map((predicate) => ({ brand: predicate })),
      ...predicates.map((predicate) => ({ model: predicate })),
      ...predicates.map((predicate) => ({ branch: { city: predicate } }))
    ];
  }

  private namePredicates(value: string): Array<Record<string, unknown>> {
    const term = value.trim();
    return [
      { arabicName: { contains: term, mode: 'insensitive' } },
      { englishName: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term.toLowerCase(), mode: 'insensitive' } },
      { aliases: { has: term } }
    ];
  }

  private orderBy(sort: PublicVehicleSort): Prisma.VehicleOrderByWithRelationInput[] {
    switch (sort) {
      case PublicVehicleSort.LowestPrice: return [{ price: 'asc' }, { id: 'asc' }];
      case PublicVehicleSort.HighestPrice: return [{ price: 'desc' }, { id: 'desc' }];
      case PublicVehicleSort.LowestMileage: return [{ mileage: 'asc' }, { id: 'asc' }];
      case PublicVehicleSort.RecentlyConfirmedAvailability: return [{ lastAvailabilityConfirmedAt: 'desc' }, { id: 'desc' }];
      default: return [{ createdAt: 'desc' }, { id: 'desc' }];
    }
  }

  private cursorPredicate(sort: PublicVehicleSort, cursor: { value: string | null; id: string }): Prisma.VehicleWhereInput {
    const direction = sort === PublicVehicleSort.LowestPrice || sort === PublicVehicleSort.LowestMileage ? 'asc' : 'desc';
    const field = sort === PublicVehicleSort.LowestPrice || sort === PublicVehicleSort.HighestPrice ? 'price' : sort === PublicVehicleSort.LowestMileage ? 'mileage' : sort === PublicVehicleSort.RecentlyConfirmedAvailability ? 'lastAvailabilityConfirmedAt' : 'createdAt';
    const comparison = direction === 'asc' ? 'gt' : 'lt';
    return {
      OR: [
        { [field]: { [comparison]: cursor.value } },
        { [field]: cursor.value, id: { [comparison]: cursor.id } }
      ]
    } as Prisma.VehicleWhereInput;
  }

  private encodeCursor(sort: PublicVehicleSort, record: PublicVehicleRecord): string {
    const value = sort === PublicVehicleSort.LowestPrice || sort === PublicVehicleSort.HighestPrice ? record.price.toString() : sort === PublicVehicleSort.LowestMileage ? record.mileage?.toString() ?? null : sort === PublicVehicleSort.RecentlyConfirmedAvailability ? record.lastAvailabilityConfirmedAt?.toISOString() ?? null : record.createdAt.toISOString();
    return Buffer.from(JSON.stringify({ v: 1, sort, value, id: record.publicId })).toString('base64url');
  }

  private decodeCursor(value: string | undefined, sort: PublicVehicleSort): { value: string | null; id: string } | null {
    if (!value) return null;
    try {
      const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as { v?: number; sort?: string; value?: string | null; id?: string };
      if (decoded.v !== 1 || decoded.sort !== sort || !decoded.id || !this.isUuid(decoded.id)) throw new Error('invalid');
      return { value: decoded.value ?? null, id: decoded.id };
    } catch {
      throw new BadRequestException({ code: 'PUBLIC_CURSOR_INVALID', message: 'مؤشر الصفحة غير صالح أو لا يطابق الفرز الحالي.' });
    }
  }

  private assertRanges(filters: PublicVehicleSearchDto): void {
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice) throw new BadRequestException({ code: 'PUBLIC_PRICE_RANGE_INVALID', message: 'نطاق السعر غير صالح.' });
    if (filters.minYear !== undefined && filters.maxYear !== undefined && filters.minYear > filters.maxYear) throw new BadRequestException({ code: 'PUBLIC_YEAR_RANGE_INVALID', message: 'نطاق السنة غير صالح.' });
    if (filters.minMileage !== undefined && filters.maxMileage !== undefined && filters.minMileage > filters.maxMileage) throw new BadRequestException({ code: 'PUBLIC_MILEAGE_RANGE_INVALID', message: 'نطاق الممشى غير صالح.' });
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
