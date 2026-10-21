import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceType } from './create-resource.dto';

export enum ProposalType {
  NEW_BUCKET = 'NEW_BUCKET',
  NEW_RESOURCE = 'NEW_RESOURCE',
}

export class ProposeResourceDto {
  @ApiProperty({ enum: ProposalType, example: ProposalType.NEW_RESOURCE })
  @IsEnum(ProposalType)
  @IsNotEmpty()
  proposalType: ProposalType;

  @ApiProperty({ example: 'Operating Systems Endsem Solved PYQs' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Solutions verified with faculty course notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Target shared bucket UUID if proposing a resource' })
  @IsOptional()
  @IsUUID()
  targetBucketId?: string;

  @ApiPropertyOptional({ enum: ResourceType, example: ResourceType.PDF })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;

  @ApiPropertyOptional({ example: 'shared/os-pyqs.pdf' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: 'https://docs.google.com/document/d/...' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional({ example: 'CSE' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: '2022' })
  @IsOptional()
  @IsString()
  batch?: string;
}

export class VoteProposalDto {
  @ApiProperty({ example: true, description: 'True for Approve, False for Reject' })
  @IsBoolean()
  @IsNotEmpty()
  vote: boolean;
}
