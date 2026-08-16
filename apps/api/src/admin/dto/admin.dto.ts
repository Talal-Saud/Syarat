import { IsDateString, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class TenantDecisionDto {
  @IsOptional()
  @IsString({ message: 'الملاحظة يجب أن تكون نصاً.' })
  @MaxLength(500, { message: 'الملاحظة طويلة جداً.' })
  note?: string;
}

export class VehicleModerationDto {
  @IsIn(['PUBLISH', 'SUSPEND', 'ARCHIVE'], { message: 'إجراء الإشراف غير صحيح.' })
  action!: 'PUBLISH' | 'SUSPEND' | 'ARCHIVE';

  @IsOptional()
  @IsString({ message: 'الملاحظة يجب أن تكون نصاً.' })
  @MaxLength(500, { message: 'الملاحظة طويلة جداً.' })
  note?: string;
}

export class PlanActivationDto {
  @IsIn(['STARTER', 'PRO'], { message: 'الخطة غير صحيحة.' })
  planCode!: 'STARTER' | 'PRO';

  @IsDateString({}, { message: 'تاريخ انتهاء الخطة غير صحيح.' })
  expiresAt!: string;
}

export class CreateBrandAdminDto {
  @IsString({ message: 'الاسم العربي مطلوب.' }) @Length(2, 120) arabicName!: string;
  @IsOptional() @IsString() @Length(2, 120) englishName?: string;
  @IsString() @Length(2, 120) slug!: string;
  @IsOptional() aliases?: string[];
}

export class CreateModelAdminDto {
  @IsString({ message: 'الاسم العربي مطلوب.' }) @Length(2, 120) arabicName!: string;
  @IsOptional() @IsString() @Length(2, 120) englishName?: string;
  @IsString() @Length(2, 120) slug!: string;
  @IsOptional() aliases?: string[];
}

export class CreateCityAdminDto {
  @IsString({ message: 'الاسم العربي مطلوب.' }) @Length(2, 120) arabicName!: string;
  @IsOptional() @IsString() @Length(2, 120) englishName?: string;
  @IsString() @Length(2, 120) slug!: string;
  @IsOptional() aliases?: string[];
}
