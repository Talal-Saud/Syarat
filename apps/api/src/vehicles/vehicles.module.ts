import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { VehiclesController } from './vehicles.controller';
import { VehicleImagesController } from './vehicle-images.controller';
import { VehicleImagesService } from './vehicle-images.service';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TenancyModule],
  controllers: [VehiclesController, VehicleImagesController],
  providers: [VehiclesService, VehicleImagesService],
  exports: [VehiclesService, VehicleImagesService]
})
export class VehiclesModule {}
