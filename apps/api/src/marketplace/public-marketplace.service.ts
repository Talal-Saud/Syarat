import { Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, Prisma, PublicationStatus, TenantStatus, VerificationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import { PublicVehicleSearchDto } from '../search/dto/public-search.dto';
import { PostgresPublicSearchService, type PublicSearchResult } from '../search/public-search.service';
import type { PublicDealerDto, PublicListResponse, PublicVehicleDto } from './dto/public-marketplace.dto';

@Injectable()
export class PublicMarketplaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: PostgresPublicSearchService
  ) {}

  async searchVehicles(filters: PublicVehicleSearchDto): Promise<PublicListResponse<PublicVehicleDto>> {
    const result: PublicSearchResult = await this.search.search(filters);
    return {
      data: result.records.map((record) => this.mapVehicle(record)),
      pageInfo: result.pageInfo
    };
  }

  async getVehicle(publicId: string): Promise<PublicVehicleDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: this.eligibility({ publicId }),
      select: {
        publicId: true,
        year: true,
        condition: true,
        price: true,
        mileage: true,
        transmission: true,
        fuelType: true,
        bodyType: true,
        description: true,
        lastAvailabilityConfirmedAt: true,
        tenant: { select: { name: true, slug: true } },
        branch: { select: { name: true, city: { select: { arabicName: true, englishName: true, slug: true } } } },
        brand: { select: { arabicName: true, englishName: true, slug: true } },
        model: { select: { arabicName: true, englishName: true, slug: true } }
      }
    });
    if (!vehicle) {
      throw new NotFoundException({ code: 'PUBLIC_VEHICLE_NOT_FOUND', message: 'السيارة المطلوبة غير متاحة في السوق العام.' });
    }
    return this.mapVehicle(vehicle);
  }

  async listDealers(limit = 50): Promise<PublicDealerDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED },
      take: limit,
      orderBy: { name: 'asc' },
      select: {
        name: true,
        slug: true,
        branches: { select: { name: true, address: true, phone: true, whatsapp: true, city: { select: { arabicName: true, englishName: true, slug: true } } }, orderBy: { isPrimary: 'desc' } },
        _count: { select: { vehicles: { where: this.eligibility() } } }
      }
    });
    return tenants.map((tenant) => ({ name: tenant.name, slug: tenant.slug, branches: tenant.branches, vehicleCount: tenant._count.vehicles }));
  }

  async getDealer(slug: string): Promise<PublicDealerDto> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED },
      select: {
        name: true,
        slug: true,
        branches: { select: { name: true, address: true, phone: true, whatsapp: true, city: { select: { arabicName: true, englishName: true, slug: true } } }, orderBy: { isPrimary: 'desc' } },
        _count: { select: { vehicles: { where: this.eligibility() } } }
      }
    });
    if (!tenant) throw new NotFoundException({ code: 'PUBLIC_DEALER_NOT_FOUND', message: 'المعرض المطلوب غير متاح.' });
    return { name: tenant.name, slug: tenant.slug, branches: tenant.branches, vehicleCount: tenant._count.vehicles };
  }

  private eligibility(extra: Prisma.VehicleWhereInput = {}): Prisma.VehicleWhereInput {
    return {
      ...extra,
      publicationStatus: PublicationStatus.PUBLISHED,
      availabilityStatus: { in: [AvailabilityStatus.AVAILABLE, AvailabilityStatus.RESERVED] },
      tenant: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED },
      branch: { city: { isActive: true } }
    };
  }

  private mapVehicle(vehicle: {
    publicId: string; year: number; condition: string; price: Prisma.Decimal; mileage: number | null; transmission: string; fuelType: string; bodyType: string; description: string | null; lastAvailabilityConfirmedAt: Date | null;
    tenant: { name: string; slug: string }; branch: { name: string; city: { arabicName: string; englishName: string | null; slug: string } }; brand: { arabicName: string; englishName: string | null; slug: string }; model: { arabicName: string; englishName: string | null; slug: string };
  }): PublicVehicleDto {
    return {
      publicId: vehicle.publicId,
      year: vehicle.year,
      condition: vehicle.condition,
      price: vehicle.price.toString(),
      mileage: vehicle.mileage,
      transmission: vehicle.transmission,
      fuel: vehicle.fuelType,
      bodyType: vehicle.bodyType,
      description: vehicle.description,
      dealer: vehicle.tenant,
      city: vehicle.branch.city,
      branchName: vehicle.branch.name,
      brand: vehicle.brand,
      model: vehicle.model,
      lastAvailabilityConfirmedAt: vehicle.lastAvailabilityConfirmedAt?.toISOString() ?? null
    };
  }
}
