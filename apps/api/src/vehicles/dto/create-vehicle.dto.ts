import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { BodyType, FuelType, TransmissionType, VehicleCondition } from '@syarat/database';

export class CreateVehicleDto {
  @IsUUID() branchId!: string;
  @IsString() stockNumber!: string;
  @IsUUID() brandId!: string;
  @IsUUID() modelId!: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(2100) year!: number;
  @IsEnum(VehicleCondition) condition!: VehicleCondition;
  @Type(() => Number) @Min(0) price!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) mileage?: number;
  @IsEnum(TransmissionType) transmission!: TransmissionType;
  @IsEnum(FuelType) fuelType!: FuelType;
  @IsEnum(BodyType) bodyType!: BodyType;
  @IsOptional() @IsString() description?: string;
}
