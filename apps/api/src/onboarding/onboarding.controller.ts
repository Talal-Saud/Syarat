import { Body, Controller, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AccessTokenPayload } from '../auth/auth.types';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { OnboardingService, type TenantRegistrationResult } from './onboarding.service';

@ApiTags('tenant-onboarding')
@UseGuards(AccessTokenGuard)
@Controller('tenant')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('registration')
  register(
    @CurrentPrincipal() principal: AccessTokenPayload,
    @Body() dto: RegisterTenantDto
  ): Promise<TenantRegistrationResult> {
    if (principal.kind !== 'staff') {
      throw new UnauthorizedException({ code: 'STAFF_SESSION_REQUIRED', message: 'يلزم تسجيل دخول مالك المعرض.' });
    }
    return this.onboardingService.register(principal.sub, dto);
  }
}
