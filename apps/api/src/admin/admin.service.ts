import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantStatus, VerificationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';

export type AdminTenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  verificationStatus: VerificationStatus;
  planCode: string;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  listTenants(): Promise<AdminTenantSummary[]> {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        verificationStatus: true,
        planCode: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approveTenant(tenantId: string): Promise<AdminTenantSummary> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'المعرض المطلوب غير موجود.' });
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        verificationStatus: true,
        planCode: true,
        createdAt: true
      }
    });
  }

  async suspendTenant(tenantId: string): Promise<AdminTenantSummary> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) {
      throw new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'المعرض المطلوب غير موجود.' });
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.SUSPENDED },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        verificationStatus: true,
        planCode: true,
        createdAt: true
      }
    });
  }
}
