import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterStartDto {
  @ApiProperty({ example: '2022CSE001', description: 'Official Institute Roll Number' })
  @IsString()
  @IsNotEmpty()
  rollNumber: string;

  @ApiProperty({ example: 'Vamsi Yarru', description: 'Full Name' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'vamsiyarru02@gmail.com', description: 'Personal Email' })
  @IsEmail()
  @IsNotEmpty()
  personalEmail: string;

  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in', description: 'Institute Email' })
  @IsEmail()
  @IsNotEmpty()
  instituteEmail: string;
}
