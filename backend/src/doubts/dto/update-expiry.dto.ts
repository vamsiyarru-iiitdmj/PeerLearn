import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateExpiryDto {
  @ApiProperty({ example: 48, description: 'New expiry duration in hours from now (1 - 168)' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(168)
  additionalHours: number;
}
