import { Injectable } from '@nestjs/common';
import { AvailabilityStatus, LeadStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import type { TenantContext } from '../tenancy/tenant-context';

export type TenantDashboardSummary = {
  vehicles: { total: number; available: number; reserved: number };
  leads: { total: number; new: number; inProgress: number };
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(context: TenantContext): Promise<TenantDashboardSummary> {
    const [totalVehicles, availableVehicles, reservedVehicles, totalLeads, newLeads, inProgressLeads] = await Promise.all([
      this.prisma.vehicle.count({ where: { tenantId: context.tenantId } }),
      this.prisma.vehicle.count({ where: { tenantId: context.tenantId, availabilityStatus: AvailabilityStatus.AVAILABLE } }),
      this.prisma.vehicle.count({ where: { tenantId: context.tenantId, availabilityStatus: AvailabilityStatus.RESERVED } }),
      this.prisma.lead.count({ where: { tenantId: context.tenantId } }),
      this.prisma.lead.count({ where: { tenantId: context.tenantId, status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { tenantId: context.tenantId, status: LeadStatus.IN_PROGRESS } })
    ]);
    return { vehicles: { total: totalVehicles, available: availableVehicles, reserved: reservedVehicles }, leads: { total: totalLeads, new: newLeads, inProgress: inProgressLeads } };
  }
}
