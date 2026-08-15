import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PlatformAdminGuard } from './platform-admin.guard';
import { AdminService, type AdminTenantSummary } from './admin.service';

@ApiTags('admin-tenants')
@UseGuards(PlatformAdminGuard)
@Controller('admin/tenants')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  listTenants(): Promise<AdminTenantSummary[]> {
    return this.adminService.listTenants();
  }

  @Post(':tenantId/approve')
  approveTenant(@Param('tenantId') tenantId: string): Promise<AdminTenantSummary> {
    return this.adminService.approveTenant(tenantId);
  }

  @Post(':tenantId/suspend')
  suspendTenant(@Param('tenantId') tenantId: string): Promise<AdminTenantSummary> {
    return this.adminService.suspendTenant(tenantId);
  }
}
