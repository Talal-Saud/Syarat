import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { FuelType, TransmissionType, VehicleCondition } from '@syarat/database';

export enum PublicVehicleSort {
  Newest = 'newest',
  LowestPrice = 'price_asc',
  HighestPrice = 'price_desc',
  LowestMileage = 'mileage_asc',
  RecentlyConfirmedAvailability = 'availability_confirmed_desc'
}

export class PublicVehicleSearchDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsEnum(VehicleCondition) condition?: VehicleCondition;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) minYear?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) maxYear?: number;
  @IsOptional() @Type(() => Number) @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) minMileage?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxMileage?: number;
  @IsOptional() @IsEnum(TransmissionType) transmission?: TransmissionType;
  @IsOptional() @IsEnum(FuelType) fuel?: FuelType;
  @IsOptional() @IsString() bodyType?: string;
  @IsOptional() @IsEnum(PublicVehicleSort) sort: PublicVehicleSort = PublicVehicleSort.Newest;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}

export type PublicPageInfo = {
  nextCursor: string | null;
  hasNextPage: boolean;
};
