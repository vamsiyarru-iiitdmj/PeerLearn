import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTargetDto } from './dto/update-target.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { AuthGuard } from '../common/guards/auth.guard';

@ApiTags('Student Profile')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1/me')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current student record' })
  async getMe(@CurrentUser() user: AuthUser) {
    return this.studentsService.getStudentByAuthId(user.id);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get full student profile with academic CPI and target calculation' })
  async getProfile(@CurrentUser() user: AuthUser) {
    return this.studentsService.getDetailedProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update student optional profile fields (phone, photoUrl)' })
  async updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.studentsService.updateProfile(user.id, dto);
  }

  @Get('academics')
  @ApiOperation({ summary: 'Get authoritative academic semester results' })
  async getAcademics(@CurrentUser() user: AuthUser) {
    return this.studentsService.getAcademics(user.id);
  }

  @Patch('target')
  @ApiOperation({ summary: 'Update target CGPA and recompute required CPI' })
  async updateTarget(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTargetDto,
  ) {
    return this.studentsService.updateTarget(user.id, dto);
  }
}
