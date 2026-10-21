import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { TagStatsDto } from './dto/tag-stats.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Matching & Tutor Inbox')
@Controller('api/v1')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Public()
  @Post('matching/tag-stats')
  @ApiOperation({ summary: 'Calculate eligible tutor count & proficiency stats for selected tags' })
  async getTagStats(@Body() dto: TagStatsDto) {
    return this.matchingService.getTagStats(dto.skillIds);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('tutor/doubts')
  @ApiOperation({ summary: 'Get matching active doubts in tutor inbox (enforces ALL-tags matching rule)' })
  async getTutorDoubts(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.matchingService.getMatchingDoubtsForTutor(user.studentId);
  }
}
