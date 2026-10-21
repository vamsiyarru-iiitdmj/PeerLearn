import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SessionMode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

export class BookSessionDto {
  @ApiProperty({ example: '2026-10-22T10:00:00.000Z', description: 'ISO scheduled start timestamp' })
  @IsDateString()
  @IsNotEmpty()
  scheduledStart: string;

  @ApiProperty({ example: '2026-10-22T11:00:00.000Z', description: 'ISO scheduled end timestamp' })
  @IsDateString()
  @IsNotEmpty()
  scheduledEnd: string;

  @ApiProperty({ enum: SessionMode, example: SessionMode.OFFLINE })
  @IsEnum(SessionMode)
  @IsNotEmpty()
  mode: SessionMode;

  @ApiPropertyOptional({ example: 'Academic Block 1, Room 204' })
  @ValidateIf((o) => o.mode === SessionMode.OFFLINE)
  @IsString()
  @IsNotEmpty({ message: 'Venue is required for offline sessions' })
  venue?: string;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  @ValidateIf((o) => o.mode === SessionMode.ONLINE)
  @IsString()
  @IsNotEmpty({ message: 'Meeting URL is required for online sessions' })
  meetingUrl?: string;
}
