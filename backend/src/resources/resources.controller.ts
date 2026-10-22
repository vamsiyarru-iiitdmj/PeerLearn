import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ProposeResourceDto, VoteProposalDto } from './dto/propose-resource.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  // --- Private Resources ---

  @Get('resources')
  @ApiOperation({ summary: 'Get current student private buckets categorized into pdfs, links, photos, text' })
  async getMyResources(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.getMyBucketsWithResources(user.studentId);
  }

  @Post('resources/buckets')
  @ApiOperation({ summary: 'Create private resource bucket (e.g. Data Science, DSA)' })
  async createBucket(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBucketDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.createBucket(user.studentId, dto);
  }

  @Post('resources')
  @ApiOperation({ summary: 'Add a PDF, link, photo, or text note to private bucket' })
  async addResource(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateResourceDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.addResource(user.studentId, dto);
  }

  @Delete('resources/:id')
  @ApiOperation({ summary: 'Delete private resource' })
  async deleteResource(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.deleteResource(id, user.studentId);
  }

  // --- Shared Resources & Voting ---

  @Get('shared-resources')
  @ApiOperation({ summary: 'Get community shared resource buckets (PYQs, CP, Dev) with approved resources' })
  async getSharedBuckets(
    @Query('department') department?: string,
    @Query('batch') batch?: string,
  ) {
    return this.resourcesService.getSharedBuckets(department, batch);
  }

  @Get('shared-resources/proposals')
  @ApiOperation({ summary: 'Get active shared resource proposals open for 24h voting' })
  async getActiveProposals(@Query('department') department?: string) {
    return this.resourcesService.getActiveProposals(department);
  }

  @Post('shared-resources/proposals')
  @ApiOperation({ summary: 'Propose a new bucket or resource for community approval' })
  async proposeSharedResource(
    @CurrentUser() user: AuthUser,
    @Body() dto: ProposeResourceDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.proposeSharedResource(user.studentId, dto);
  }

  @Post('shared-resources/proposals/:id/vote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cast vote on shared resource proposal (contributor cannot vote on own proposal)' })
  async voteOnProposal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VoteProposalDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.resourcesService.voteOnProposal(id, user.studentId, dto);
  }
}
