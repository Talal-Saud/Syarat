import { ArrayMinSize, IsArray, IsISO8601, IsOptional, IsUUID } from 'class-validator';

export class BulkConfirmAvailabilityDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) vehicleIds!: string[];
}

export class ReserveVehicleDto {
  @IsOptional() @IsISO8601() expiresAt?: string;
}
