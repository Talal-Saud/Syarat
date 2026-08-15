import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, Prisma, PublicationStatus } from '@syarat/database';

import type { TenantContext } from '../tenancy/tenant-context';
import { PrismaService } from '../database/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

export type TenantVehicle = {
  id: string; stockNumber: string; year: number; price: Prisma.Decimal; publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityStatus; branchId: string; brandId: string; modelId: string;
};

const vehicleSelect = {
  id: true, stockNumber: true, year: true, price: true, publicationStatus: true,
  availabilityStatus: true, branchId: true, brandId: true, modelId: true
} satisfies Prisma.VehicleSelect;

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext): Promise<TenantVehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) },
      select: vehicleSelect, orderBy: { createdAt: 'desc' }
    });
  }

  async get(context: TenantContext, vehicleId: string): Promise<TenantVehicle> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) }, select: vehicleSelect });
    if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'السيارة المطلوبة غير موجودة ضمن المعرض الحالي.' });
    return vehicle;
  }

  async create(context: TenantContext, dto: CreateVehicleDto): Promise<TenantVehicle> {
    await this.assertBranchAndModel(context, dto.branchId, dto.brandId, dto.modelId);
    return this.prisma.vehicle.create({ data: { tenantId: context.tenantId, ...dto, publicationStatus: PublicationStatus.DRAFT, availabilityStatus: AvailabilityStatus.AVAILABLE }, select: vehicleSelect });
  }

  async update(context: TenantContext, vehicleId: string, dto: UpdateVehicleDto): Promise<TenantVehicle> {
    const current = await this.get(context, vehicleId);
    if (dto.branchId || dto.brandId || dto.modelId) await this.assertBranchAndModel(context, dto.branchId ?? current.branchId, dto.brandId ?? current.brandId, dto.modelId ?? current.modelId);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: { ...dto, ...(dto.price !== undefined && dto.price !== current.price.toNumber() ? { priceUpdatedAt: new Date() } : {}) }, select: vehicleSelect });
      if (dto.price !== undefined && dto.price !== current.price.toNumber()) await tx.priceHistory.create({ data: { tenantId: context.tenantId, vehicleId, previousPrice: current.price, newPrice: dto.price, changedByMembershipId: context.membershipId } });
      return updated;
    });
  }

  async publish(context: TenantContext, vehicleId: string): Promise<TenantVehicle> {
    const current = await this.get(context, vehicleId);
    if (current.availabilityStatus === AvailabilityStatus.SOLD) throw new ForbiddenException({ code: 'SOLD_VEHICLE', message: 'لا يمكن نشر سيارة مباعة.' });
    return this.changeStatus(context, vehicleId, { publicationStatus: PublicationStatus.PUBLISHED }, 'نشر السيارة');
  }

  async archive(context: TenantContext, vehicleId: string): Promise<TenantVehicle> {
    await this.get(context, vehicleId);
    return this.changeStatus(context, vehicleId, { publicationStatus: PublicationStatus.ARCHIVED }, 'أرشفة السيارة');
  }

  private async changeStatus(context: TenantContext, vehicleId: string, data: Prisma.VehicleUpdateInput, reason: string): Promise<TenantVehicle> {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.vehicle.findFirstOrThrow({ where: { id: vehicleId, tenantId: context.tenantId }, select: { publicationStatus: true, availabilityStatus: true } });
      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data, select: vehicleSelect });
      await tx.vehicleStatusHistory.create({ data: { tenantId: context.tenantId, vehicleId, previousPublicationStatus: before.publicationStatus, newPublicationStatus: updated.publicationStatus, previousAvailabilityStatus: before.availabilityStatus, newAvailabilityStatus: updated.availabilityStatus, changedByMembershipId: context.membershipId, reason } });
      return updated;
    });
  }

  private async assertBranchAndModel(context: TenantContext, branchId: string, brandId: string, modelId: string): Promise<void> {
    if (context.branchScope.kind === 'limited' && !context.branchScope.branchIds.includes(branchId)) throw new ForbiddenException({ code: 'BRANCH_SCOPE_DENIED', message: 'لا تملك صلاحية العمل على هذا الفرع.' });
    const [branch, model] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: branchId, tenantId: context.tenantId }, select: { id: true } }),
      this.prisma.vehicleModel.findFirst({ where: { id: modelId, brandId, isActive: true }, select: { id: true } })
    ]);
    if (!branch) throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'الفرع المطلوب غير موجود ضمن المعرض.' });
    if (!model) throw new NotFoundException({ code: 'CATALOG_MODEL_NOT_FOUND', message: 'الماركة أو الموديل المحدد غير متاح.' });
  }
}
