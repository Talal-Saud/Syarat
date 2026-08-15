import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({ example: '0551234567' })
  @IsString()
  @Matches(/^(?:\+966|00966|0)?5\d{8}$/)
  phone!: string;

  @ApiProperty({ minLength: 12 })
  @IsString()
  @MinLength(12)
  password!: string;
}
