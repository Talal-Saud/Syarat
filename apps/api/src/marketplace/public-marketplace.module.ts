import { Module } from '@nestjs/common';

import { PublicSearchModule } from '../search/public-search.module';
import { PublicMarketplaceController } from './public-marketplace.controller';
import { PublicMarketplaceService } from './public-marketplace.service';

@Module({
  imports: [PublicSearchModule],
  controllers: [PublicMarketplaceController],
  providers: [PublicMarketplaceService]
})
export class PublicMarketplaceModule {}
