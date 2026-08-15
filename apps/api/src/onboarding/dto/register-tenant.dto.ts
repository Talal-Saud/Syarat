import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class RegisterTenantDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsUUID()
  cityId!: string;

  @IsString()
  @MaxLength(180)
  branchName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;
}
