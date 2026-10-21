import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBucketDto {
  @ApiProperty({ example: 'Data Science', description: 'Bucket title' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Machine learning notes, Kaggle notebooks and lecture slides' })
  @IsOptional()
  @IsString()
  description?: string;
}
