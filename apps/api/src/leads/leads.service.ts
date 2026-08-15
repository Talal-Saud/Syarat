import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenancy/tenant-context';

export type TenantLead = {
  id: string;
  vehicleId: string | null;
  name: string | null;
  source: string;
  status: string;
  createdAt: Date;
};

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  list(context: TenantContext): Promise<TenantLead[]> {
    return this.prisma.lead.findMany({
      where: { tenantId: context.tenantId },
      select: { id: true, vehicleId: true, name: true, source: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateStatus(context: TenantContext, leadId: string, status: LeadStatus): Promise<TenantLead> {
    const lead = await this.prisma.lead.findFirst({ where: { id: leadId, tenantId: context.tenantId }, select: { id: true } });
    if (!lead) throw new NotFoundException({ code: 'LEAD_NOT_FOUND', message: 'العميل المحتمل غير موجود.' });
    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { status },
      select: { id: true, vehicleId: true, name: true, source: true, status: true, createdAt: true }
    });
  }
}
