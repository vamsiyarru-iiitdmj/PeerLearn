import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoubtDto {
  @ApiProperty({
    example: 'Struggling with Red-Black tree rotation rules and node recoloring in edge cases.',
    description: 'Detailed description of the doubt',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'Be able to trace right/left rotations and solve CLRS exercises independently.',
    description: 'Expected learning outcome after the peer-tutoring session',
  })
  @IsString()
  @IsNotEmpty()
  expectedOutcome: string;

  @ApiProperty({
    example: ['bc5c113c-f69b-4b2a-aedf-dcc3e8365851'],
    description: 'Skill tags associated with this doubt',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds: string[];

  @ApiPropertyOptional({
    example: 24,
    description: 'Hours before doubt expires automatically (default 24, max 168)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168)
  expiryHours?: number;
}
