import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { BulkConfirmAvailabilityDto, ReserveVehicleDto } from './dto/inventory.dto';
import { InventoryService, type InventoryVehicle } from './inventory.service';

@ApiTags('tenant-inventory')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Post('vehicles/:id/confirm-availability') @RequirePermission('inventory.manage')
  confirm(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<InventoryVehicle> { return this.inventory.confirmAvailability(context, id); }
  @Post('vehicles/confirm-availability') @RequirePermission('inventory.manage')
  bulkConfirm(@CurrentTenantContext() context: TenantContext, @Body() dto: BulkConfirmAvailabilityDto): Promise<InventoryVehicle[]> { return this.inventory.bulkConfirmAvailability(context, dto.vehicleIds); }
  @Post('vehicles/:id/reservations') @RequirePermission('inventory.manage')
  reserve(@CurrentTenantContext() context: TenantContext, @Param('id') id: string, @Body() dto: ReserveVehicleDto): Promise<{ id: string; status: string; vehicleId: string }> { return this.inventory.reserve(context, id, dto.expiresAt ? new Date(dto.expiresAt) : undefined); }
  @Post('reservations/:id/release') @RequirePermission('inventory.manage')
  release(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<void> { return this.inventory.releaseReservation(context, id); }
  @Post('vehicles/:id/mark-sold') @RequirePermission('inventory.manage')
  sold(@CurrentTenantContext() context: TenantContext, @Param('id') id: string): Promise<InventoryVehicle> { return this.inventory.markSold(context, id); }
}
