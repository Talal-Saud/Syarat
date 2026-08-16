import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';

export type CatalogCity = {
  id: string;
  arabicName: string;
  englishName: string | null;
  aliases: string[];
  slug: string;
};

export type CatalogBrand = {
  id: string;
  arabicName: string;
  englishName: string | null;
  aliases: string[];
  slug: string;
};

export type CatalogVehicleModel = {
  id: string;
  arabicName: string;
  englishName: string | null;
  aliases: string[];
  slug: string;
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicCities(): Promise<CatalogCity[]> {
    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true },
      orderBy: { arabicName: 'asc' }
    });
  }

  listPublicBrands(): Promise<CatalogBrand[]> {
    return this.prisma.brand.findMany({
      where: { isActive: true },
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true },
      orderBy: { arabicName: 'asc' }
    });
  }

  async listPublicModels(brandId: string): Promise<CatalogVehicleModel[]> {
    const brand = await this.prisma.brand.findFirst({ where: { id: brandId, isActive: true }, select: { id: true } });
    if (!brand) {
      throw new NotFoundException({ code: 'BRAND_NOT_FOUND', message: 'الماركة المطلوبة غير موجودة.' });
    }
    return this.prisma.vehicleModel.findMany({
      where: { brandId, isActive: true },
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true },
      orderBy: { arabicName: 'asc' }
    });
  }

  createCity(dto: CreateCityDto): Promise<CatalogCity> {
    return this.prisma.city.create({
      data: dto,
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true }
    });
  }

  createBrand(dto: CreateBrandDto): Promise<CatalogBrand> {
    return this.prisma.brand.create({
      data: dto,
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true }
    });
  }

  async createVehicleModel(brandId: string, dto: CreateVehicleModelDto): Promise<CatalogVehicleModel> {
    const brand = await this.prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) {
      throw new NotFoundException({ code: 'BRAND_NOT_FOUND', message: 'الماركة المطلوبة غير موجودة.' });
    }
    return this.prisma.vehicleModel.create({
      data: { brandId, ...dto },
      select: { id: true, arabicName: true, englishName: true, aliases: true, slug: true }
    });
  }
}
