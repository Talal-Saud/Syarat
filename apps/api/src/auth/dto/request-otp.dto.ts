import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';

export enum OtpPurposeDto {
  CUSTOMER_LOGIN = 'CUSTOMER_LOGIN',
  QUOTE_REQUEST = 'QUOTE_REQUEST'
}

export class RequestOtpDto {
  @ApiProperty({ example: '0551234567' })
  @IsString()
  @Matches(/^(?:\+966|00966|0)?5\d{8}$/)
  phone!: string;

  @ApiProperty({ enum: OtpPurposeDto, example: OtpPurposeDto.QUOTE_REQUEST })
  @IsEnum(OtpPurposeDto)
  purpose!: OtpPurposeDto;
}
