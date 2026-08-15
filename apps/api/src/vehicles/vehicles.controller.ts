import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService, type TenantVehicle } from './vehicles.service';

@ApiTags('tenant-vehicles')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get() @RequirePermission('vehicles.read')
  list(@CurrentTenantContext() context: TenantContext): Promise<TenantVehicle[]> { return this.vehiclesService.list(context); }

  @Get(':id') @RequirePermission('vehicles.read')
  get(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<TenantVehicle> { return this.vehiclesService.get(context, id); }

  @Post() @RequirePermission('vehicles.manage')
  create(@CurrentTenantContext() context: TenantContext, @Body() dto: CreateVehicleDto): Promise<TenantVehicle> { return this.vehiclesService.create(context, dto); }

  @Patch(':id') @RequirePermission('vehicles.manage')
  update(@CurrentTenantContext() context: TenantContext, @Param('id') id: string, @Body() dto: UpdateVehicleDto): Promise<TenantVehicle> { return this.vehiclesService.update(context, id, dto); }

  @Post(':id/publish') @RequirePermission('vehicles.manage')
  publish(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<TenantVehicle> { return this.vehiclesService.publish(context, id); }

  @Post(':id/archive') @RequirePermission('vehicles.manage')
  archive(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<TenantVehicle> { return this.vehiclesService.archive(context, id); }
}
