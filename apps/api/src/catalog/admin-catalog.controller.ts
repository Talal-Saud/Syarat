import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PlatformAdminGuard } from '../admin/platform-admin.guard';
import { PlatformAdminPermissionGuard } from '../admin/platform-admin-permission.guard';
import { RequirePlatformPermission } from '../admin/platform-admin-permissions';
import { CatalogService } from './catalog.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateCityDto } from './dto/create-city.dto';
import { CreateVehicleModelDto } from './dto/create-vehicle-model.dto';

@ApiTags('admin-catalog')
@UseGuards(PlatformAdminGuard, PlatformAdminPermissionGuard)
@RequirePlatformPermission('catalog.manage')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('cities')
  createCity(@Body() dto: CreateCityDto) {
    return this.catalogService.createCity(dto);
  }

  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.catalogService.createBrand(dto);
  }

  @Post('brands/:brandId/models')
  createVehicleModel(@Param('brandId') brandId: string, @Body() dto: CreateVehicleModelDto) {
    return this.catalogService.createVehicleModel(brandId, dto);
  }
}
