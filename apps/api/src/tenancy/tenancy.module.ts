import { Module } from '@nestjs/common';

import { PermissionGuard } from './permission.guard';
import { TenantContextGuard } from './tenant-context.guard';
import { TenantContextService } from './tenant-context.service';

@Module({
  providers: [TenantContextService, TenantContextGuard, PermissionGuard],
  exports: [TenantContextService, TenantContextGuard, PermissionGuard]
})
export class TenancyModule {}
