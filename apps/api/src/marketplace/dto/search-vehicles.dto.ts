import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { FuelType, TransmissionType, VehicleCondition } from '@syarat/database';
export class SearchVehiclesDto {
 @IsOptional() @IsUUID() cityId?: string; @IsOptional() @IsUUID() brandId?: string; @IsOptional() @IsUUID() modelId?: string;
 @IsOptional() @IsEnum(VehicleCondition) condition?: VehicleCondition; @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType; @IsOptional() @IsEnum(FuelType) fuelType?: FuelType;
 @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) minYear?: number; @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) maxYear?: number;
 @IsOptional() @Type(() => Number) @Min(0) minPrice?: number; @IsOptional() @Type(() => Number) @Min(0) maxPrice?: number;
 @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxMileage?: number; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit=24;
}
