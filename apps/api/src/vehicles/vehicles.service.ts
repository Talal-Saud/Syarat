import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, PublicationStatus } from '@syarat/database';

import type { TenantContext } from '../tenancy/tenant-context';
import { PrismaService } from '../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

export type TenantVehicle = {
  id: string; stockNumber: string; year: number; price: unknown; publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityStatus; branchId: string; brandId: string; modelId: string;
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext): Promise<TenantVehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) },
      select: { id: true, stockNumber: true, year: true, price: true, publicationStatus: true, availabilityStatus: true, branchId: true, brandId: true, modelId: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(context: TenantContext, dto: CreateVehicleDto): Promise<TenantVehicle> {
    if (context.branchScope.kind === 'limited' && !context.branchScope.branchIds.includes(dto.branchId)) {
      throw new ForbiddenException({ code: 'BRANCH_SCOPE_DENIED', message: 'لا تملك صلاحية العمل على هذا الفرع.' });
    }
    const [branch, model] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: dto.branchId, tenantId: context.tenantId }, select: { id: true } }),
      this.prisma.vehicleModel.findFirst({ where: { id: dto.modelId, brandId: dto.brandId, isActive: true }, select: { id: true } })
    ]);
    if (!branch) throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'الفرع المطلوب غير موجود ضمن المعرض.' });
    if (!model) throw new NotFoundException({ code: 'CATALOG_MODEL_NOT_FOUND', message: 'الماركة أو الموديل المحدد غير متاح.' });
    return this.prisma.vehicle.create({
      data: { tenantId: context.tenantId, ...dto, price: dto.price, publicationStatus: PublicationStatus.DRAFT, availabilityStatus: AvailabilityStatus.AVAILABLE },
      select: { id: true, stockNumber: true, year: true, price: true, publicationStatus: true, availabilityStatus: true, branchId: true, brandId: true, modelId: true }
    });
  }
}
