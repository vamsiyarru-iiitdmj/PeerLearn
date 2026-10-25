import { IsOptional, IsString, IsIn, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryDoubtsDto {
  @ApiPropertyOptional({ enum: ['all', 'solved', 'unsolved'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'solved', 'unsolved'])
  tab?: string = 'all';

  @ApiPropertyOptional({ description: 'Filter by skill tag UUID' })
  @IsOptional()
  @IsUUID()
  tagId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
