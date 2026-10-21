import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Ratings')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('sessions/:id/rating')
  @ApiOperation({ summary: 'Submit confidential session rating (strictly private from tutor, released weekly)' })
  async submitRating(
    @CurrentUser() user: AuthUser,
    @Param('id') sessionId: string,
    @Body() dto: SubmitRatingDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.ratingsService.submitRating(sessionId, user.studentId, dto);
  }

  @Post('ratings/recompute-weekly')
  @ApiOperation({ summary: 'Trigger weekly tutor proficiency score recomputation' })
  async recomputeScores() {
    return this.ratingsService.recomputeTutorScores();
  }
}
