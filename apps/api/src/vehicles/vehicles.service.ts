import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, PublicationStatus, ReservationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenancy/tenant-context';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

export type TenantVehicle = {
  id: string;
  stockNumber: string;
  year: number;
  price: unknown;
  publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityStatus;
  branchId: string;
  brandId: string;
  modelId: string;
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext): Promise<TenantVehicle[]> {
    return this.prisma.vehicle.findMany({
      where: {
        tenantId: context.tenantId,
        ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {})
      },
      select: this.vehicleSelection,
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
      data: {
        tenantId: context.tenantId,
        ...dto,
        price: dto.price,
        publicationStatus: PublicationStatus.DRAFT,
        availabilityStatus: AvailabilityStatus.AVAILABLE
      },
      select: this.vehicleSelection
    });
  }

  async confirmAvailability(context: TenantContext, vehicleId: string): Promise<TenantVehicle> {
    const vehicle = await this.getScopedVehicle(context, vehicleId);
    return this.prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        lastAvailabilityConfirmedAt: new Date(),
        nextConfirmationDueAt: new Date(Date.now() + 7 * 86_400_000),
        confirmedByMembershipId: context.membershipId
      },
      select: this.vehicleSelection
    });
  }

  async reserve(context: TenantContext, vehicleId: string, holdHours = 24): Promise<{ reservationId: string; expiresAt: Date }> {
    const vehicle = await this.getScopedVehicle(context, vehicleId);
    if (vehicle.availabilityStatus !== AvailabilityStatus.AVAILABLE) {
      throw new ConflictException({ code: 'VEHICLE_NOT_AVAILABLE', message: 'المركبة غير متاحة للحجز.' });
    }

    return this.prisma.$transaction(async (transaction) => {
      const activeReservation = await transaction.reservation.findFirst({
        where: { tenantId: context.tenantId, vehicleId, status: ReservationStatus.ACTIVE, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        select: { id: true }
      });
      if (activeReservation) {
        throw new ConflictException({ code: 'VEHICLE_ALREADY_RESERVED', message: 'المركبة محجوزة بالفعل.' });
      }
      const expiresAt = new Date(Date.now() + holdHours * 3_600_000);
      const reservation = await transaction.reservation.create({ data: { tenantId: context.tenantId, vehicleId, expiresAt } });
      await transaction.vehicle.update({ where: { id: vehicle.id }, data: { availabilityStatus: AvailabilityStatus.RESERVED } });
      return { reservationId: reservation.id, expiresAt };
    }, { isolationLevel: 'Serializable' });
  }

  private async getScopedVehicle(context: TenantContext, vehicleId: string): Promise<{ id: string; branchId: string; availabilityStatus: AvailabilityStatus }> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { tenantId: context.tenantId, id: vehicleId },
      select: { id: true, branchId: true, availabilityStatus: true }
    });
    if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'المركبة المطلوبة غير موجودة.' });
    if (context.branchScope.kind === 'limited' && !context.branchScope.branchIds.includes(vehicle.branchId)) {
      throw new ForbiddenException({ code: 'BRANCH_SCOPE_DENIED', message: 'لا تملك صلاحية العمل على هذا الفرع.' });
    }
    return vehicle;
  }

  private readonly vehicleSelection = {
    id: true,
    stockNumber: true,
    year: true,
    price: true,
    publicationStatus: true,
    availabilityStatus: true,
    branchId: true,
    brandId: true,
    modelId: true
  } as const;
}
