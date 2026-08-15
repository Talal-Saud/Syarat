import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { VehiclesService, type TenantVehicle } from './vehicles.service';

@ApiTags('tenant-vehicles')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @RequirePermission('vehicles.read')
  list(@CurrentTenantContext() context: TenantContext): Promise<TenantVehicle[]> {
    return this.vehiclesService.list(context);
  }

  @Post()
  @RequirePermission('vehicles.manage')
  create(@CurrentTenantContext() context: TenantContext, @Body() dto: CreateVehicleDto): Promise<TenantVehicle> {
    return this.vehiclesService.create(context, dto);
  }

  @Post(':vehicleId/availability/confirm')
  @RequirePermission('inventory.manage')
  confirmAvailability(@CurrentTenantContext() context: TenantContext, @Param('vehicleId') vehicleId: string): Promise<TenantVehicle> {
    return this.vehiclesService.confirmAvailability(context, vehicleId);
  }

  @Post(':vehicleId/reservations')
  @RequirePermission('inventory.manage')
  reserve(@CurrentTenantContext() context: TenantContext, @Param('vehicleId') vehicleId: string): Promise<{ reservationId: string; expiresAt: Date }> {
    return this.vehiclesService.reserve(context, vehicleId);
  }
}
