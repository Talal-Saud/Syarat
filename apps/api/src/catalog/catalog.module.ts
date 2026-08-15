import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicCatalogController } from './public-catalog.controller';

@Module({
  imports: [AdminModule],
  controllers: [PublicCatalogController, AdminCatalogController],
  providers: [CatalogService],
  exports: [CatalogService]
})
export class CatalogModule {}
