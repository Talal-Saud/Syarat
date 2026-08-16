import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PublicVehicleSearchDto } from '../search/dto/public-search.dto';
import type { PublicDealerDto, PublicListResponse, PublicVehicleDto } from './dto/public-marketplace.dto';
import { PublicMarketplaceService } from './public-marketplace.service';

@ApiTags('public-marketplace')
@Controller('public')
export class PublicMarketplaceController {
  constructor(private readonly marketplace: PublicMarketplaceService) {}

  @Get('vehicles')
  vehicles(@Query() filters: PublicVehicleSearchDto): Promise<PublicListResponse<PublicVehicleDto>> {
    return this.marketplace.searchVehicles(filters);
  }

  @Get('vehicles/:publicId')
  vehicle(@Param('publicId') publicId: string): Promise<PublicVehicleDto> {
    return this.marketplace.getVehicle(publicId);
  }

  @Get('dealers')
  dealers(): Promise<PublicDealerDto[]> {
    return this.marketplace.listDealers();
  }

  @Get('dealers/:slug')
  dealer(@Param('slug') slug: string): Promise<PublicDealerDto> {
    return this.marketplace.getDealer(slug);
  }
}
