import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminPermissionGuard } from './platform-admin-permission.guard';
import { RequirePlatformPermission } from './platform-admin-permissions';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AccessTokenPayload } from '../auth/auth.types';
import { AdminService } from './admin.service';
import { CreateBrandAdminDto, CreateCityAdminDto, CreateModelAdminDto, PlanActivationDto, TenantDecisionDto, VehicleModerationDto } from './dto/admin.dto';

@ApiTags('platform-admin')
@Controller('admin')
@UseGuards(PlatformAdminGuard, PlatformAdminPermissionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tenants')
  @RequirePlatformPermission('tenants.read')
  listTenants() { return this.adminService.listTenants(); }

  @Get('tenants/:id')
  @RequirePlatformPermission('tenants.read')
  getTenant(@Param('id') id: string) { return this.adminService.getTenant(id); }

  @Post('tenants/:id/approve')
  @RequirePlatformPermission('tenants.manage')
  approveTenant(@Param('id') id: string, @Body() dto: TenantDecisionDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.decideTenant(id, 'approve', dto, principal.sub); }

  @Post('tenants/:id/reject')
  @RequirePlatformPermission('tenants.manage')
  rejectTenant(@Param('id') id: string, @Body() dto: TenantDecisionDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.decideTenant(id, 'reject', dto, principal.sub); }

  @Post('tenants/:id/suspend')
  @RequirePlatformPermission('tenants.manage')
  suspendTenant(@Param('id') id: string, @Body() dto: TenantDecisionDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.decideTenant(id, 'suspend', dto, principal.sub); }

  @Post('tenants/:id/reactivate')
  @RequirePlatformPermission('tenants.manage')
  reactivateTenant(@Param('id') id: string, @Body() dto: TenantDecisionDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.decideTenant(id, 'reactivate', dto, principal.sub); }

  @Patch('tenants/:id/plan')
  @RequirePlatformPermission('plans.manage')
  activatePlan(@Param('id') id: string, @Body() dto: PlanActivationDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.activatePlan(id, dto, principal.sub); }

  @Patch('vehicles/:id/moderation')
  @RequirePlatformPermission('vehicles.moderate')
  moderateVehicle(@Param('id') id: string, @Body() dto: VehicleModerationDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.moderateVehicle(id, dto, principal.sub); }

  @Get('stats/leads')
  @RequirePlatformPermission('stats.read')
  leadStats() { return this.adminService.leadStats(); }

  @Get('audit-logs')
  @RequirePlatformPermission('audit.read')
  auditLogs() { return this.adminService.listAuditLogs(); }

  @Get('catalog/brands')
  @RequirePlatformPermission('catalog.manage')
  brands() { return this.adminService.listBrands(); }

  @Get('catalog/cities')
  @RequirePlatformPermission('catalog.manage')
  cities() { return this.adminService.listCities(); }

  @Post('catalog/brands')
  @RequirePlatformPermission('catalog.manage')
  createBrand(@Body() dto: CreateBrandAdminDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.createBrand(dto, principal.sub); }

  @Post('catalog/brands/:brandId/models')
  @RequirePlatformPermission('catalog.manage')
  createModel(@Param('brandId') brandId: string, @Body() dto: CreateModelAdminDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.createModel(brandId, dto, principal.sub); }

  @Post('catalog/cities')
  @RequirePlatformPermission('catalog.manage')
  createCity(@Body() dto: CreateCityAdminDto, @CurrentPrincipal() principal: AccessTokenPayload) { return this.adminService.createCity(dto, principal.sub); }
}
