import { IsNotEmpty, IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddSkillDto {
  @ApiProperty({ example: 'bc5c113c-f69b-4b2a-aedf-dcc3e8365851', description: 'Skill UUID' })
  @IsUUID()
  @IsNotEmpty()
  skillId: string;
}

export class SetProSkillsDto {
  @ApiProperty({
    example: ['bc5c113c-f69b-4b2a-aedf-dcc3e8365851', '5f2d1ae0-05bf-47cf-8603-f831a959f2ae'],
    description: 'Array of Skill UUIDs',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  skillIds: string[];
}
