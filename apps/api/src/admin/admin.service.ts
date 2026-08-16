import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PublicationStatus, TenantStatus, VerificationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import { type CreateBrandAdminDto, type CreateCityAdminDto, type CreateModelAdminDto, type PlanActivationDto, type TenantDecisionDto, type VehicleModerationDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants(): Promise<unknown> {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, publicId: true, name: true, slug: true, status: true, verificationStatus: true, planCode: true, subscriptionExpiresAt: true, createdAt: true, _count: { select: { vehicles: true, memberships: true, leads: true } } } });
  }

  async getTenant(id: string): Promise<unknown> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, publicId: true, name: true, slug: true, status: true, verificationStatus: true, planCode: true, subscriptionExpiresAt: true, createdAt: true, updatedAt: true, branches: { select: { id: true, name: true, phone: true, city: { select: { arabicName: true, englishName: true } } } }, _count: { select: { vehicles: true, memberships: true, leads: true } } } });
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'المعرض غير موجود.' });
    return tenant;
  }

  async decideTenant(id: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate', dto: TenantDecisionDto, actorUserId: string): Promise<unknown> {
    const current = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!current) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'المعرض غير موجود.' });
    const next: Record<typeof action, { status: TenantStatus; verificationStatus?: VerificationStatus }> = {
      approve: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED },
      reject: { status: TenantStatus.REJECTED, verificationStatus: VerificationStatus.REJECTED },
      suspend: { status: TenantStatus.SUSPENDED },
      reactivate: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED }
    };
    const change = next[action];
    const tenant = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({ where: { id }, data: change, select: { id: true, name: true, status: true, verificationStatus: true } });
      await tx.auditLog.create({ data: { actorUserId, action: `TENANT_${action.toUpperCase()}`, entityType: 'Tenant', entityId: id, metadata: { previousStatus: current.status, nextStatus: change.status, note: dto.note ?? null } } });
      return updated;
    });
    return tenant;
  }

  async moderateVehicle(id: string, dto: VehicleModerationDto, actorUserId: string): Promise<unknown> {
    const current = await this.prisma.vehicle.findUnique({ where: { id }, select: { id: true, tenantId: true, publicationStatus: true } });
    if (!current) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'المركبة غير موجودة.' });
    const status: Record<VehicleModerationDto['action'], PublicationStatus> = { PUBLISH: PublicationStatus.PUBLISHED, SUSPEND: PublicationStatus.SUSPENDED, ARCHIVE: PublicationStatus.ARCHIVED };
    const updated = await this.prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.update({ where: { id }, data: { publicationStatus: status[dto.action] }, select: { id: true, publicId: true, publicationStatus: true, availabilityStatus: true } });
      await tx.auditLog.create({ data: { actorUserId, action: `VEHICLE_${dto.action}`, entityType: 'Vehicle', entityId: id, metadata: { tenantId: current.tenantId, previousStatus: current.publicationStatus, nextStatus: status[dto.action], note: dto.note ?? null } } });
      return vehicle;
    });
    return updated;
  }

  async activatePlan(id: string, dto: PlanActivationDto, actorUserId: string): Promise<unknown> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id }, select: { id: true, planCode: true, subscriptionExpiresAt: true } });
    if (!tenant) throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'المعرض غير موجود.' });
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date()) throw new BadRequestException({ code: 'PLAN_EXPIRY_PAST', message: 'تاريخ انتهاء الخطة يجب أن يكون في المستقبل.' });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({ where: { id }, data: { planCode: dto.planCode, subscriptionExpiresAt: expiresAt }, select: { id: true, planCode: true, subscriptionExpiresAt: true } });
      await tx.auditLog.create({ data: { actorUserId, action: 'TENANT_PLAN_ACTIVATED_MANUALLY', entityType: 'Tenant', entityId: id, metadata: { previousPlan: tenant.planCode, nextPlan: dto.planCode, expiresAt: expiresAt.toISOString() } } });
      return updated;
    });
  }

  async leadStats(): Promise<unknown> {
    const [byStatus, total, last30Days] = await Promise.all([
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } })
    ]);
    return { total, last30Days, byStatus: byStatus.map((item) => ({ status: item.status, count: item._count._all })) };
  }

  async listAuditLogs(): Promise<unknown> {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, action: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { id: true, phoneE164: true } } } });
  }

  async listBrands(): Promise<unknown> { return this.prisma.brand.findMany({ orderBy: { arabicName: 'asc' }, select: { id: true, arabicName: true, englishName: true, slug: true, aliases: true, isActive: true, _count: { select: { models: true, vehicles: true } } } }); }
  async listCities(): Promise<unknown> { return this.prisma.city.findMany({ orderBy: { arabicName: 'asc' }, select: { id: true, arabicName: true, englishName: true, slug: true, aliases: true, isActive: true, _count: { select: { branches: true } } } }); }
  async createBrand(dto: CreateBrandAdminDto, actorUserId: string): Promise<unknown> { const brand = await this.prisma.brand.create({ data: { arabicName: dto.arabicName, englishName: dto.englishName, slug: dto.slug, aliases: dto.aliases ?? [] } }); await this.audit(actorUserId, 'BRAND_CREATED', 'Brand', brand.id, { slug: brand.slug }); return brand; }
  async createModel(brandId: string, dto: CreateModelAdminDto, actorUserId: string): Promise<unknown> { const model = await this.prisma.vehicleModel.create({ data: { brandId, arabicName: dto.arabicName, englishName: dto.englishName, slug: dto.slug, aliases: dto.aliases ?? [] } }); await this.audit(actorUserId, 'MODEL_CREATED', 'VehicleModel', model.id, { brandId }); return model; }
  async createCity(dto: CreateCityAdminDto, actorUserId: string): Promise<unknown> { const city = await this.prisma.city.create({ data: { arabicName: dto.arabicName, englishName: dto.englishName, slug: dto.slug, aliases: dto.aliases ?? [] } }); await this.audit(actorUserId, 'CITY_CREATED', 'City', city.id, { slug: city.slug }); return city; }

  private async audit(actorUserId: string, action: string, entityType: string, entityId: string, metadata: Prisma.InputJsonValue): Promise<void> { await this.prisma.auditLog.create({ data: { actorUserId, action, entityType, entityId, metadata } }); }
}
