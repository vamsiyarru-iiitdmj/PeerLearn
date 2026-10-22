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
  @ApiPropertyOptional({ enum: ProposalType, example: ProposalType.NEW_RESOURCE })
  @IsOptional()
  @IsEnum(ProposalType)
  proposalType?: ProposalType = ProposalType.NEW_RESOURCE;

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
  resourceType?: any;

  @ApiPropertyOptional({ example: 'PDF' })
  @IsOptional()
  type?: any;

  @ApiPropertyOptional({ example: 'shared/os-pyqs.pdf' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ example: 'https://docs.google.com/document/d/...' })
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional({ example: 'https://iiitdmj.ac.in/academics/...' })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({ example: 'CSE 2025 Shared Vault' })
  @IsOptional()
  @IsString()
  targetBucketName?: string;

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
  @ApiProperty({ example: true, description: 'True for Approve, False for Reject, or UP/DOWN' })
  @IsNotEmpty()
  vote: any;
}
