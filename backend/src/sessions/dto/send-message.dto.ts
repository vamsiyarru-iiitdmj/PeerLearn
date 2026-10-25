import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  RESOURCE = 'RESOURCE',
  REPLACEMENT_REQUEST = 'REPLACEMENT_REQUEST',
}

export class SendMessageDto {
  @ApiProperty({ example: 'Hey! Ready for our session today?' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({ description: 'Optional resource UUID attached to chat message' })
  @IsOptional()
  @IsUUID()
  resourceId?: string;
}

export class RequestReplacementDto {
  @ApiProperty({ example: 'Sudden lab exam clash during scheduled hour' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'd0b81c1c-3c87-4309-8472-04e82df4bcf5', description: 'Proposed replacement tutor student ID' })
  @IsOptional()
  @IsUUID()
  replacementTutorId?: string;
}
