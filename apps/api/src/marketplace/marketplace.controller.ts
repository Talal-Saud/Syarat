import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { SearchVehiclesDto } from './dto/search-vehicles.dto';
import { MarketplaceService, type MarketplaceVehicle } from './marketplace.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly service: MarketplaceService) {}

  @Get('vehicles')
  search(@Query() dto: SearchVehiclesDto): Promise<MarketplaceVehicle[]> {
    return this.service.search(dto);
  }
}
