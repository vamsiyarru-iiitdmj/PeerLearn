import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TagStatsDto {
  @ApiProperty({
    example: ['bc5c113c-f69b-4b2a-aedf-dcc3e8365851'],
    description: 'Selected skill tag UUIDs for stats calculation',
  })
  @IsArray()
  @IsNotEmpty()
  @IsUUID('4', { each: true })
  skillIds: string[];
}
