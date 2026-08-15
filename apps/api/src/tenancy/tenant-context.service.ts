import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { MembershipStatus, TenantStatus, VerificationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import { permissionsForRole } from './permission-map';
import type { TenantContext } from './tenant-context';

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(input: { userId: string; membershipId?: string; correlationId: string }): Promise<TenantContext> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: {
        userId: input.userId,
        status: MembershipStatus.ACTIVE,
        tenant: { status: TenantStatus.ACTIVE, verificationStatus: VerificationStatus.APPROVED }
      },
      include: {
        tenant: { select: { id: true } },
        branchScopes: { select: { branchId: true } }
      }
    });

    const membership = input.membershipId
      ? memberships.find((candidate) => candidate.id === input.membershipId)
      : memberships.length === 1
        ? memberships[0]
        : undefined;

    if (!membership) {
      if (memberships.length > 1 && !input.membershipId) {
        throw new ForbiddenException({ code: 'ACTIVE_MEMBERSHIP_REQUIRED', message: 'اختر المعرض النشط لإتمام العملية.' });
      }
      throw new UnauthorizedException({ code: 'TENANT_MEMBERSHIP_INVALID', message: 'لا تملك عضوية نشطة في المعرض المطلوب.' });
    }

    const branchScope = membership.branchScopeAll
      ? { kind: 'all' as const }
      : { kind: 'limited' as const, branchIds: membership.branchScopes.map((scope) => scope.branchId) };

    return {
      kind: 'tenant',
      tenantId: membership.tenant.id,
      userId: input.userId,
      membershipId: membership.id,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
      branchScope,
      correlationId: input.correlationId
    };
  }
}
