import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { DashboardService, type TenantDashboardSummary } from './dashboard.service';

@ApiTags('tenant-dashboard')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermission('tenant.read')
  summary(@CurrentTenantContext() context: TenantContext): Promise<TenantDashboardSummary> {
    return this.dashboardService.summary(context);
  }
}
