import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: '2022cse001@iiitdmj.ac.in' })
  @IsEmail()
  @IsNotEmpty()
  instituteEmail: string;
}
