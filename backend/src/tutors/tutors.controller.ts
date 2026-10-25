import {
  Controller,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TutorsService } from './tutors.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Tutors')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/tutor')
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current tutor profile, proficiency score, experience & mastered skills' })
  async getTutorProfile(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.tutorsService.getTutorProfile(user.studentId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get college tutor leaderboard and current tutor ranking' })
  async getLeaderboard(@CurrentUser() user: AuthUser) {
    return this.tutorsService.getLeaderboard(user?.studentId);
  }
}
