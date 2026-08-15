import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
@Module({ imports: [TenancyModule], controllers: [VehiclesController], providers: [VehiclesService] })
export class VehiclesModule {}
