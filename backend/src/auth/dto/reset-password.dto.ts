import { IsNotEmpty, IsString, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: '25bcs270@iiitdmj.ac.in', required: false })
  @IsEmail()
  @IsOptional()
  instituteEmail?: string;

  @ApiProperty({ description: 'OTP verification code sent to institute email', required: false })
  @IsString()
  @IsOptional()
  otp?: string;

  @ApiProperty({ description: 'Password reset token received via email', required: false })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiProperty({ example: 'NewStrongPassword123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
