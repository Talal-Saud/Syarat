import { Module } from '@nestjs/common';

import { PostgresPublicSearchService } from './public-search.service';

@Module({
  providers: [PostgresPublicSearchService],
  exports: [PostgresPublicSearchService]
})
export class PublicSearchModule {}
