import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in', description: 'Institute Email' })
  @IsEmail()
  @IsNotEmpty()
  instituteEmail: string;

  @ApiProperty({ example: 'StrongPassword123!', description: 'Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
