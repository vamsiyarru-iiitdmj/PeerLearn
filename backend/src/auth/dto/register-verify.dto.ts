import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterVerifyDto {
  @ApiProperty({ example: '2022CSE001' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in' })
  @IsEmail()
  @IsNotEmpty()
  instituteEmail: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Account Password' })
  @IsString()
  @MinLength(6)
  password: string;
}
