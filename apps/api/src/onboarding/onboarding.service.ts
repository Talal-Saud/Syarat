import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipRole, MembershipStatus, TenantStatus, UserStatus, VerificationStatus } from '@syarat/database';

import { PrismaService } from '../database/prisma.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';

export type TenantRegistrationResult = {
  tenant: { id: string; name: string; slug: string; status: TenantStatus; verificationStatus: VerificationStatus };
  branch: { id: string; name: string; cityId: string; isPrimary: boolean };
};

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: RegisterTenantDto): Promise<TenantRegistrationResult> {
    const [user, city, existing] = await Promise.all([
      this.prisma.user.findFirst({ where: { id: userId, status: UserStatus.ACTIVE }, select: { id: true } }),
      this.prisma.city.findFirst({ where: { id: dto.cityId, isActive: true }, select: { id: true } }),
      this.prisma.tenant.findUnique({ where: { slug: dto.slug }, select: { id: true } })
    ]);
    if (!user) {
      throw new ForbiddenException({ code: 'USER_INACTIVE', message: 'لا يمكن تسجيل منشأة من هذا الحساب.' });
    }
    if (!city) {
      throw new NotFoundException({ code: 'CITY_NOT_FOUND', message: 'المدينة المحددة غير متاحة.' });
    }
    if (existing) {
      throw new ConflictException({ code: 'TENANT_SLUG_EXISTS', message: 'معرّف المعرض مستخدم بالفعل.' });
    }

    return this.prisma.$transaction(async (transaction) => {
      const tenant = await transaction.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          status: TenantStatus.PENDING,
          verificationStatus: VerificationStatus.PENDING
        }
      });
      await transaction.tenantMembership.create({
        data: {
          tenantId: tenant.id,
          userId,
          role: MembershipRole.OWNER,
          status: MembershipStatus.ACTIVE,
          branchScopeAll: true
        }
      });
      const branch = await transaction.branch.create({
        data: {
          tenantId: tenant.id,
          cityId: dto.cityId,
          name: dto.branchName,
          phone: dto.phone,
          whatsapp: dto.whatsapp,
          isPrimary: true
        }
      });
      return { tenant, branch };
    });
  }
}
