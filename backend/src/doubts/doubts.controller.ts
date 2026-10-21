import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DoubtsService } from './doubts.service';
import { CreateDoubtDto } from './dto/create-doubt.dto';
import { QueryDoubtsDto } from './dto/query-doubts.dto';
import { UpdateExpiryDto } from './dto/update-expiry.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Doubts')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/doubts')
export class DoubtsController {
  constructor(private readonly doubtsService: DoubtsService) {}

  @Post()
  @ApiOperation({ summary: 'Post a new doubt with skill tags (Routes to matching tutors)' })
  async createDoubt(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDoubtDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.doubtsService.createDoubt(user.studentId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get student doubts (filter by solved/unsolved tabs or skill tags)' })
  async getMyDoubts(
    @CurrentUser() user: AuthUser,
    @Query() query: QueryDoubtsDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.doubtsService.getMyDoubts(user.studentId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed doubt info' })
  async getDoubtById(@Param('id') id: string) {
    return this.doubtsService.getDoubtById(id);
  }

  @Post(':id/withdraw')
  @ApiOperation({ summary: 'Withdraw an open doubt' })
  async withdrawDoubt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.doubtsService.withdrawDoubt(id, user.studentId);
  }

  @Patch(':id/expiry')
  @ApiOperation({ summary: 'Update or extend doubt expiry timing' })
  async updateExpiry(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateExpiryDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.doubtsService.updateExpiry(id, user.studentId, dto);
  }
}
