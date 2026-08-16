import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AvailabilityStatus, LeadActivityType, LeadStatus, Prisma, PublicationStatus } from '@syarat/database';
import { createHmac } from 'node:crypto';

import { type Environment } from '@syarat/config';
import { PrismaService } from '../database/prisma.service';
import { normalizeSaudiPhone } from '../auth/phone-normalizer';
import { type TenantContext } from '../tenancy/tenant-context';
import { type AssignLeadDto, type QuoteRequestDto, type UpdateLeadDto } from './dto/lead.dto';

const leadSelect = {
  id: true, tenantId: true, branchId: true, vehicleId: true, customerUserId: true, name: true, phoneE164: true,
  assignedEmployeeId: true, source: true, message: true, status: true, createdAt: true, updatedAt: true,
  branch: { select: { id: true, name: true } },
  vehicle: { select: { publicId: true, stockNumber: true, year: true, price: true, brand: { select: { arabicName: true, englishName: true } }, model: { select: { arabicName: true, englishName: true } } } },
  assignedEmployee: { select: { id: true, role: true, user: { select: { id: true, phoneE164: true } } } },
  activities: { orderBy: { createdAt: 'asc' as const }, select: { id: true, type: true, fromStatus: true, toStatus: true, note: true, actorMembershipId: true, createdAt: true } }
} satisfies Prisma.LeadSelect;

type LeadResult = Prisma.LeadGetPayload<{ select: typeof leadSelect }>;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService, private readonly environment: Environment) {}

  async list(context: TenantContext): Promise<unknown> {
    const where: Prisma.LeadWhereInput = { tenantId: context.tenantId };
    if (context.branchScope.kind === 'limited') where.branchId = { in: [...context.branchScope.branchIds] };
    const leads = await this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, select: leadSelect });
    return leads.map((lead) => this.toPublicLead(lead));
  }

  async get(id: string, context: TenantContext): Promise<unknown> {
    const lead = await this.prisma.lead.findFirst({ where: this.scopedWhere(id, context), select: leadSelect });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'الـLead غير موجود.' });
    return this.toPublicLead(lead);
  }

  async update(id: string, dto: UpdateLeadDto, context: TenantContext): Promise<unknown> {
    const current = await this.prisma.lead.findFirst({ where: this.scopedWhere(id, context), select: { id: true, status: true } });
    if (!current) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'الـLead غير موجود.' });
    if (dto.status === undefined && dto.note === undefined) throw new BadRequestException({ code: 'LEAD_UPDATE_EMPTY', message: 'يجب إرسال حالة أو ملاحظة.' });
    const updated = await this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.update({ where: { id }, data: { ...(dto.status ? { status: dto.status } : {}) }, select: leadSelect });
      if (dto.status && dto.status !== current.status) await tx.leadActivity.create({ data: { tenantId: context.tenantId, leadId: id, actorMembershipId: context.membershipId, type: LeadActivityType.STATUS_CHANGED, fromStatus: current.status, toStatus: dto.status, note: dto.note } });
      else if (dto.note) await tx.leadActivity.create({ data: { tenantId: context.tenantId, leadId: id, actorMembershipId: context.membershipId, type: LeadActivityType.NOTE_ADDED, note: dto.note } });
      return lead;
    });
    return this.toPublicLead(updated);
  }

  async assign(id: string, dto: AssignLeadDto, context: TenantContext): Promise<unknown> {
    const target = await this.prisma.tenantMembership.findFirst({ where: { id: dto.assignedEmployeeId, tenantId: context.tenantId, status: 'ACTIVE' }, select: { id: true, role: true } });
    if (!target) throw new BadRequestException({ code: 'ASSIGNEE_INVALID', message: 'الموظف المحدد غير صالح لهذا المعرض.' });
    const lead = await this.prisma.lead.findFirst({ where: this.scopedWhere(id, context), select: { id: true } });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'الـLead غير موجود.' });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.lead.update({ where: { id }, data: { assignedEmployeeId: dto.assignedEmployeeId }, select: leadSelect });
      await tx.leadActivity.create({ data: { tenantId: context.tenantId, leadId: id, actorMembershipId: context.membershipId, type: LeadActivityType.ASSIGNED, note: `تم التعيين للعضوية ${dto.assignedEmployeeId}.` } });
      return result;
    });
    return this.toPublicLead(updated);
  }

  async createQuoteRequest(publicId: string, dto: QuoteRequestDto, customerUserId: string): Promise<unknown> {
    const phoneE164 = normalizeSaudiPhone(dto.phone);
    const vehicle = await this.prisma.vehicle.findFirst({ where: { publicId, publicationStatus: PublicationStatus.PUBLISHED, tenant: { status: 'ACTIVE', verificationStatus: 'APPROVED' }, branch: { city: { isActive: true } } }, select: { id: true, tenantId: true, branchId: true, availabilityStatus: true } });
    if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_AVAILABLE', message: 'السيارة غير متاحة لطلب عرض سعر.' });
    if (vehicle.availabilityStatus === AvailabilityStatus.SOLD) throw new ConflictException({ code: 'SOLD_VEHICLE', message: 'لا يمكن طلب عرض سعر لسيارة مباعة.' });
    if (vehicle.availabilityStatus !== AvailabilityStatus.AVAILABLE && vehicle.availabilityStatus !== AvailabilityStatus.RESERVED) throw new ConflictException({ code: 'VEHICLE_NOT_AVAILABLE', message: 'السيارة غير متاحة لطلب عرض سعر.' });
    const phoneHash = this.hashPhone(phoneE164);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await this.prisma.lead.findFirst({ where: { tenantId: vehicle.tenantId, vehicleId: vehicle.id, customerUserId, createdAt: { gte: cutoff } }, select: { id: true, status: true } });
    if (existing) return { deduplicated: true, leadId: existing.id, status: existing.status };
    const lead = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({ data: { tenantId: vehicle.tenantId, branchId: vehicle.branchId, vehicleId: vehicle.id, customerUserId, name: dto.name.trim(), phoneE164, phoneHash, source: 'QUOTE_REQUEST', message: dto.message?.trim() }, select: { id: true, status: true, createdAt: true } });
      await tx.leadActivity.create({ data: { tenantId: vehicle.tenantId, leadId: created.id, type: LeadActivityType.CREATED, toStatus: LeadStatus.NEW, note: 'تم إنشاء طلب عرض سعر من الصفحة العامة.' } });
      return created;
    });
    return { deduplicated: false, leadId: lead.id, status: lead.status, createdAt: lead.createdAt };
  }

  private scopedWhere(id: string, context: TenantContext): Prisma.LeadWhereInput {
    return { id, tenantId: context.tenantId, ...(context.branchScope.kind === 'limited' ? { branchId: { in: [...context.branchScope.branchIds] } } : {}) };
  }

  private toPublicLead(lead: LeadResult) {
    return { ...lead, phoneE164: this.maskPhone(lead.phoneE164), vehicle: lead.vehicle ? { ...lead.vehicle, price: lead.vehicle.price.toString() } : null };
  }

  private maskPhone(phone: string) { return phone.length > 4 ? `${phone.slice(0, 4)}****${phone.slice(-2)}` : '****'; }
  private hashPhone(phone: string) { return createHmac('sha256', this.environment.OTP_HMAC_SECRET).update(phone).digest('hex'); }
}
