import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterVerifyDto {
  @ApiProperty({ example: '25BCS270' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @IsString()
  @IsOptional()
  roll_number?: string;

  @ApiProperty({ example: '25bcs270@iiitdmj.ac.in', required: false })
  @IsEmail()
  @IsOptional()
  instituteEmail?: string;

  @IsEmail()
  @IsOptional()
  institute_email?: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Account Password' })
  @IsString()
  @MinLength(6)
  password: string;
}
