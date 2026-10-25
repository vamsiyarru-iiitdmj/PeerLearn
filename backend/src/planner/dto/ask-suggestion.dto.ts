import { IsNotEmpty, IsString, IsArray, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AskSuggestionDto {
  @ApiProperty({ example: 'Stuck on memoization table indexing for 2D DP' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({ example: '3 hours free tonight' })
  @IsOptional()
  @IsString()
  timeAvailable?: string;

  @ApiPropertyOptional({
    example: ['bc5c113c-f69b-4b2a-aedf-dcc3e8365851'],
    description: 'Related skill tag UUIDs',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds?: string[];
}

export class RespondSuggestionDto {
  @ApiProperty({ example: '3-Step Bottom-Up DP Mastery Plan' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'First define the state clearly, then build base cases.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [
      'Step 1: Write recursive brute-force solution with base conditions',
      'Step 2: Add 2D cache table of size (n+1) x (W+1) and store overlapping states',
      'Step 3: Convert to iterative bottom-up array and verify space optimization',
    ],
    description: 'Ordered actionable workflow steps',
  })
  @IsArray()
  @IsString({ each: true })
  steps: string[];
}

export class UsePlanDto {
  @ApiProperty({ description: 'Suggestion response plan UUID to adopt as subtasks' })
  @IsUUID()
  @IsNotEmpty()
  responseId: string;
}
