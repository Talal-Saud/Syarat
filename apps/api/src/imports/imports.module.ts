import { Module } from '@nestjs/common';

import { TenancyModule } from '../tenancy/tenancy.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ImportsController } from './imports.controller';
import { ImportQueueService } from './import-queue.service';
import { ImportValidatorService } from './import-validator.service';
import { ImportsService } from './imports.service';

@Module({
  imports: [TenancyModule, VehiclesModule],
  controllers: [ImportsController],
  providers: [ImportsService, ImportValidatorService, ImportQueueService],
  exports: [ImportsService, ImportValidatorService, ImportQueueService]
})
export class ImportsModule {}
