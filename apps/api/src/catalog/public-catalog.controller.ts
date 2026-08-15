import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CatalogService } from './catalog.service';

@ApiTags('public-catalog')
@Controller('public')
export class PublicCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('cities')
  cities() {
    return this.catalogService.listPublicCities();
  }

  @Get('brands')
  brands() {
    return this.catalogService.listPublicBrands();
  }

  @Get('brands/:brandId/models')
  models(@Param('brandId') brandId: string) {
    return this.catalogService.listPublicModels(brandId);
  }
}
