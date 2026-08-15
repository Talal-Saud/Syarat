import { IsEnum } from 'class-validator';
import { LeadStatus } from '@syarat/database';

export class UpdateLeadStatusDto {
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}
