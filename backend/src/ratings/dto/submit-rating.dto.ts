import {
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitRatingDto {
  @ApiProperty({ example: 5, description: 'Rating scale from 1 to 5' })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Explained rotation rules clearly with great visual intuition!' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ example: true, description: 'Confirms that the session originally took place' })
  @IsBoolean()
  @IsNotEmpty()
  didSessionHappen: boolean;
}
