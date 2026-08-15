import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, Prisma, PublicationStatus, ReservationStatus } from '@syarat/database';
import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenancy/tenant-context';

export type InventoryVehicle = { id: string; publicationStatus: PublicationStatus; availabilityStatus: AvailabilityStatus; lastAvailabilityConfirmedAt: Date | null; nextConfirmationDueAt: Date | null };

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async confirmAvailability(context: TenantContext, vehicleId: string): Promise<InventoryVehicle> {
    const vehicle = await this.findVehicle(context, vehicleId);
    if (vehicle.availabilityStatus === AvailabilityStatus.SOLD) throw new ConflictException({ code: 'SOLD_VEHICLE', message: 'لا يمكن تأكيد توفر سيارة مباعة.' });
    const now = new Date(); const due = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: { availabilityStatus: AvailabilityStatus.AVAILABLE, lastAvailabilityConfirmedAt: now, nextConfirmationDueAt: due, confirmedByMembershipId: context.membershipId }, select: this.inventorySelect });
      await this.statusHistory(tx, context, vehicleId, vehicle.publicationStatus, updated.publicationStatus, vehicle.availabilityStatus, updated.availabilityStatus, 'تأكيد التوفر');
      return updated;
    });
  }

  async bulkConfirmAvailability(context: TenantContext, vehicleIds: string[]): Promise<InventoryVehicle[]> {
    const ids = [...new Set(vehicleIds)];
    return Promise.all(ids.map((id) => this.confirmAvailability(context, id)));
  }

  async reserve(context: TenantContext, vehicleId: string, expiresAt?: Date): Promise<{ id: string; status: ReservationStatus; vehicleId: string }> {
    return this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) }, select: { id: true, publicationStatus: true, availabilityStatus: true } });
      if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'السيارة المطلوبة غير موجودة ضمن المعرض الحالي.' });
      if (vehicle.availabilityStatus !== AvailabilityStatus.AVAILABLE) throw new ConflictException({ code: 'VEHICLE_NOT_AVAILABLE', message: 'السيارة غير متاحة للحجز.' });
      const existing = await tx.reservation.findFirst({ where: { tenantId: context.tenantId, vehicleId, status: ReservationStatus.ACTIVE }, select: { id: true } });
      if (existing) throw new ConflictException({ code: 'ACTIVE_RESERVATION_EXISTS', message: 'يوجد حجز نشط لهذه السيارة.' });
      const reservation = await tx.reservation.create({ data: { tenantId: context.tenantId, vehicleId, expiresAt }, select: { id: true, status: true, vehicleId: true } });
      await tx.vehicle.update({ where: { id: vehicleId }, data: { availabilityStatus: AvailabilityStatus.RESERVED } });
      await this.statusHistory(tx, context, vehicleId, vehicle.publicationStatus, vehicle.publicationStatus, vehicle.availabilityStatus, AvailabilityStatus.RESERVED, 'حجز السيارة');
      return reservation;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async releaseReservation(context: TenantContext, reservationId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({ where: { id: reservationId, tenantId: context.tenantId, status: ReservationStatus.ACTIVE }, include: { vehicle: { select: { publicationStatus: true, availabilityStatus: true } } } });
      if (!reservation) throw new NotFoundException({ code: 'RESERVATION_NOT_FOUND', message: 'الحجز النشط المطلوب غير موجود ضمن المعرض الحالي.' });
      await tx.reservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.RELEASED } });
      await tx.vehicle.update({ where: { id: reservation.vehicleId }, data: { availabilityStatus: AvailabilityStatus.AVAILABLE } });
      await this.statusHistory(tx, context, reservation.vehicleId, reservation.vehicle.publicationStatus, reservation.vehicle.publicationStatus, reservation.vehicle.availabilityStatus, AvailabilityStatus.AVAILABLE, 'إلغاء الحجز');
    });
  }

  async markSold(context: TenantContext, vehicleId: string): Promise<InventoryVehicle> {
    const vehicle = await this.findVehicle(context, vehicleId);
    return this.prisma.$transaction(async (tx) => {
      await tx.reservation.updateMany({ where: { tenantId: context.tenantId, vehicleId, status: ReservationStatus.ACTIVE }, data: { status: ReservationStatus.CANCELLED } });
      const updated = await tx.vehicle.update({ where: { id: vehicleId }, data: { publicationStatus: PublicationStatus.ARCHIVED, availabilityStatus: AvailabilityStatus.SOLD }, select: this.inventorySelect });
      await this.statusHistory(tx, context, vehicleId, vehicle.publicationStatus, updated.publicationStatus, vehicle.availabilityStatus, updated.availabilityStatus, 'تم بيع السيارة');
      return updated;
    });
  }

  private readonly inventorySelect = { id: true, publicationStatus: true, availabilityStatus: true, lastAvailabilityConfirmedAt: true, nextConfirmationDueAt: true } satisfies Prisma.VehicleSelect;
  private async findVehicle(context: TenantContext, id: string): Promise<{ id: string; publicationStatus: PublicationStatus; availabilityStatus: AvailabilityStatus }> {
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id, tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) }, select: { id: true, publicationStatus: true, availabilityStatus: true } });
    if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'السيارة المطلوبة غير موجودة ضمن المعرض الحالي.' }); return vehicle;
  }
  private statusHistory(tx: Prisma.TransactionClient, context: TenantContext, vehicleId: string, previousPublicationStatus: PublicationStatus, newPublicationStatus: PublicationStatus, previousAvailabilityStatus: AvailabilityStatus, newAvailabilityStatus: AvailabilityStatus, reason: string): Promise<unknown> {
    return tx.vehicleStatusHistory.create({ data: { tenantId: context.tenantId, vehicleId, previousPublicationStatus, newPublicationStatus, previousAvailabilityStatus, newAvailabilityStatus, changedByMembershipId: context.membershipId, reason } });
  }
}
