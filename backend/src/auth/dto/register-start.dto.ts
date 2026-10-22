import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStartDto {
  @ApiProperty({ example: '25BCS270', description: 'Official Institute Roll Number' })
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @IsString()
  @IsOptional()
  roll_number?: string;

  @ApiProperty({ example: 'Vamsi Adithya', description: 'Full Name' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: 'vamsi@example.com', description: 'Personal Email' })
  @IsEmail()
  @IsOptional()
  personalEmail?: string;

  @IsEmail()
  @IsOptional()
  personal_email?: string;

  @ApiProperty({ example: '25bcs270@iiitdmj.ac.in', description: 'Institute Email' })
  @IsEmail()
  @IsOptional()
  instituteEmail?: string;

  @IsEmail()
  @IsOptional()
  institute_email?: string;

  @ApiProperty({ example: '25bcs270@iiitdmj.ac.in', description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
