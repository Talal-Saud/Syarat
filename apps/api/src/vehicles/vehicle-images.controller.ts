import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { VehicleImagesService, type TenantVehicleImage } from './vehicle-images.service';

@ApiTags('tenant-vehicle-images')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/vehicles')
export class VehicleImagesController {
  constructor(private readonly vehicleImages: VehicleImagesService) {}

  @Post(':id/images')
  @ApiConsumes('multipart/form-data')
  @RequirePermission('vehicles.manage')
  async upload(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') vehicleId: string,
    @Req() request: FastifyRequest
  ): Promise<TenantVehicleImage> {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException({
        code: 'IMAGE_FILE_REQUIRED',
        message: 'يرجى إرفاق ملف صورة واحد.'
      });
    }

    const bytes = await file.toBuffer();
    if (file.file.truncated) {
      throw new BadRequestException({
        code: 'IMAGE_UPLOAD_TRUNCATED',
        message: 'تجاوز ملف الصورة الحد المسموح للرفع.'
      });
    }

    return this.vehicleImages.upload(context, vehicleId, {
      bytes,
      filename: file.filename,
      mimeType: file.mimetype
    });
  }

  @Get(':id/images')
  @RequirePermission('vehicles.read')
  list(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') vehicleId: string
  ): Promise<TenantVehicleImage[]> {
    return this.vehicleImages.list(context, vehicleId);
  }

  @Post(':id/images/:imageId/set-primary')
  @RequirePermission('vehicles.manage')
  setPrimary(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') vehicleId: string,
    @Param('imageId') imageId: string
  ): Promise<TenantVehicleImage> {
    return this.vehicleImages.setPrimary(context, vehicleId, imageId);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(204)
  @RequirePermission('vehicles.manage')
  async remove(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') vehicleId: string,
    @Param('imageId') imageId: string
  ): Promise<void> {
    await this.vehicleImages.remove(context, vehicleId, imageId);
  }
}
