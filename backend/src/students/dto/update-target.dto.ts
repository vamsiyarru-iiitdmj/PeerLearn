import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTargetDto {
  @ApiProperty({ example: 9.0, description: 'Target CGPA (0.0 to 10.0)' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(10)
  targetCgpa: number;
}
