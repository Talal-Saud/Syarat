import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformAdminPermissionGuard } from './platform-admin-permission.guard';

@Module({ controllers: [AdminController], providers: [AdminService, PlatformAdminGuard, PlatformAdminPermissionGuard], exports: [AdminService] })
export class AdminModule {}
