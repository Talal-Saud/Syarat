import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadsService, type TenantLead } from './leads.service';

@ApiTags('tenant-leads')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission('leads.read')
  list(@CurrentTenantContext() context: TenantContext): Promise<TenantLead[]> {
    return this.leadsService.list(context);
  }

  @Patch(':leadId/status')
  @RequirePermission('leads.manage')
  updateStatus(
    @CurrentTenantContext() context: TenantContext,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadStatusDto
  ): Promise<TenantLead> {
    return this.leadsService.updateStatus(context, leadId, dto.status);
  }
}
