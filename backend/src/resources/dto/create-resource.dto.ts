import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResourceType {
  PDF = 'PDF',
  LINK = 'LINK',
  PHOTO = 'PHOTO',
  TEXT = 'TEXT',
  NOTE = 'NOTE',
}

export class CreateResourceDto {
  @ApiProperty({ example: 'bc5c113c-f69b-4b2a-aedf-dcc3e8365851' })
  @IsUUID()
  @IsNotEmpty()
  bucketId: string;

  @ApiProperty({ enum: ResourceType, example: ResourceType.PDF })
  @IsEnum(ResourceType)
  @IsNotEmpty()
  type: ResourceType;

  @ApiProperty({ example: 'Endsem PYQs 2024 with Solutions' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Complete step-by-step solved question paper' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'resources/user-123/notes.pdf' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: 'https://github.com/vamsiyarru-iiitdmj/PeerLearn' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional({ example: 'Key formula: Recurrence relation T(n) = 2T(n/2) + O(n)' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ example: 'Notes content' })
  @IsOptional()
  @IsString()
  content?: string;
}
