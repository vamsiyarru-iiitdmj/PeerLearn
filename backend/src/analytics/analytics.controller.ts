import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Campus Analytics')
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Get('overview')
  @ApiOperation({ summary: 'Get college peer learning metrics overview' })
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Public()
  @Get('doubts-by-month')
  @ApiOperation({ summary: 'Get monthly doubt trends (asked vs solved)' })
  async getDoubtsByMonth() {
    return this.analyticsService.getDoubtsByMonth();
  }

  @Public()
  @Get('doubts-by-skill')
  @ApiOperation({ summary: 'Get doubt volume breakdown by subject/skill tag (hardest topics)' })
  async getDoubtsBySkill() {
    return this.analyticsService.getDoubtsBySkill();
  }

  @Public()
  @Get('doubts-by-year')
  @ApiOperation({ summary: 'Get doubts distribution across study years (with < 10 student privacy suppression)' })
  async getDoubtsByYear() {
    return this.analyticsService.getDoubtsByYear();
  }

  @Public()
  @Get('tutor-supply')
  @ApiOperation({ summary: 'Get tutor supply vs demand comparison per skill' })
  async getTutorSupply() {
    return this.analyticsService.getTutorSupplyVsDemand();
  }
}
