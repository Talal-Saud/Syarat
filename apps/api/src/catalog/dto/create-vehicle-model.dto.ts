import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateVehicleModelDto {
  @IsString()
  @MaxLength(120)
  arabicName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  englishName?: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
