import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in', description: 'Institute Email' })
  @IsEmail()
  @IsOptional()
  instituteEmail?: string;

  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in', description: 'Institute Email alias' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in', description: 'Institute Email alias' })
  @IsEmail()
  @IsOptional()
  institute_email?: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
