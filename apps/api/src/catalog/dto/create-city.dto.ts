import { IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @MaxLength(120)
  arabicName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  englishName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
