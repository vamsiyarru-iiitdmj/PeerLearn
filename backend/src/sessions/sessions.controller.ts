import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { BookSessionDto } from './dto/book-session.dto';
import { SendMessageDto, RequestReplacementDto } from './dto/send-message.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('doubts/:doubtId/book')
  @ApiOperation({ summary: 'Atomic booking of an open doubt by a tutor (1 winner, conflict safe)' })
  async bookDoubt(
    @CurrentUser() user: AuthUser,
    @Param('doubtId') doubtId: string,
    @Body() dto: BookSessionDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.bookDoubt(doubtId, user.studentId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List user sessions (as student or tutor)' })
  async getSessions(
    @CurrentUser() user: AuthUser,
    @Query('mode') mode?: 'student' | 'tutor',
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.getSessions(user.studentId, mode);
  }

  @Get('tutor/sessions')
  @ApiOperation({ summary: 'List tutor booked sessions' })
  async getTutorSessions(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.getSessions(user.studentId, 'tutor');
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session details by ID' })
  async getSessionById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.getSessionById(id, user.studentId);
  }

  @Post('sessions/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tutor marks session as completed' })
  async completeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.completeSession(id, user.studentId);
  }

  @Post('sessions/:id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Student confirms session completion' })
  async confirmSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.confirmSession(id, user.studentId);
  }

  @Post('sessions/:id/request-replacement')
  @ApiOperation({ summary: 'Tutor requests replacement for an unavailable session' })
  async requestReplacement(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RequestReplacementDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.requestReplacement(id, user.studentId, dto);
  }

  @Post('sessions/:id/messages')
  @ApiOperation({ summary: 'Send a message in session chat' })
  async sendMessage(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.sendMessage(id, user.studentId, dto);
  }

  @Get('sessions/:id/messages')
  @ApiOperation({ summary: 'Get session chat message history' })
  async getMessages(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.sessionsService.getMessages(id, user.studentId);
  }
}
