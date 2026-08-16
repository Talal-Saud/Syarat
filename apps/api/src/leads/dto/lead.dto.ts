import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export const leadStatuses = ['NEW', 'CONTACTED', 'INTERESTED', 'APPOINTMENT', 'WON', 'LOST'] as const;
export type LeadStatusValue = (typeof leadStatuses)[number];

export class UpdateLeadDto {
  @IsOptional()
  @IsIn(leadStatuses, { message: 'حالة الـLead غير صحيحة.' })
  status?: LeadStatusValue;

  @IsOptional()
  @IsString({ message: 'الملاحظة يجب أن تكون نصاً.' })
  @MaxLength(2000, { message: 'الملاحظة طويلة جداً.' })
  note?: string;
}

export class AssignLeadDto {
  @IsString({ message: 'معرّف الموظف مطلوب.' })
  @Length(36, 36, { message: 'معرّف الموظف غير صحيح.' })
  assignedEmployeeId!: string;
}

export class QuoteRequestDto {
  @IsString({ message: 'الاسم مطلوب.' })
  @Length(2, 120, { message: 'الاسم يجب أن يكون بين حرفين و120 حرفاً.' })
  name!: string;

  @IsString({ message: 'رقم الجوال مطلوب.' })
  phone!: string;

  @IsOptional()
  @IsString({ message: 'الرسالة يجب أن تكون نصاً.' })
  @MaxLength(2000, { message: 'الرسالة طويلة جداً.' })
  message?: string;
}
