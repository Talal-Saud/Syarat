import { Injectable } from '@nestjs/common';
import { AvailabilityStatus, PublicationStatus, Prisma } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import { SearchVehiclesDto } from './dto/search-vehicles.dto';

export type MarketplaceVehicle = {
  id: string;
  year: number;
  price: unknown;
  mileage: number | null;
  condition: string;
  transmission: string;
  fuelType: string;
  bodyType: string;
  brand: { arabicName: string; slug: string };
  model: { arabicName: string; slug: string };
  branch: { name: string; city: { arabicName: string; slug: string } };
  images: { storageKey: string }[];
};

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchVehiclesDto): Promise<MarketplaceVehicle[]> {
    const where: Prisma.VehicleWhereInput = {
      publicationStatus: PublicationStatus.PUBLISHED,
      availabilityStatus: AvailabilityStatus.AVAILABLE,
      ...(dto.cityId ? { branch: { cityId: dto.cityId } } : {}),
      ...(dto.brandId ? { brandId: dto.brandId } : {}),
      ...(dto.modelId ? { modelId: dto.modelId } : {}),
      ...(dto.condition ? { condition: dto.condition } : {}),
      ...(dto.transmission ? { transmission: dto.transmission } : {}),
      ...(dto.fuelType ? { fuelType: dto.fuelType } : {}),
      ...(dto.minYear || dto.maxYear ? { year: { ...(dto.minYear ? { gte: dto.minYear } : {}), ...(dto.maxYear ? { lte: dto.maxYear } : {}) } } : {}),
      ...(dto.minPrice || dto.maxPrice ? { price: { ...(dto.minPrice ? { gte: dto.minPrice } : {}), ...(dto.maxPrice ? { lte: dto.maxPrice } : {}) } } : {}),
      ...(dto.maxMileage ? { mileage: { lte: dto.maxMileage } } : {})
    };
    return this.prisma.vehicle.findMany({
      where,
      take: dto.limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, year: true, price: true, mileage: true, condition: true, transmission: true, fuelType: true, bodyType: true,
        brand: { select: { arabicName: true, slug: true } },
        model: { select: { arabicName: true, slug: true } },
        branch: { select: { name: true, city: { select: { arabicName: true, slug: true } } } },
        images: { where: { isPrimary: true }, take: 1, select: { storageKey: true } }
      }
    });
  }
}
