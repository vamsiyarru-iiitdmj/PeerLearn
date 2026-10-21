import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';
import { AddSkillDto, SetProSkillsDto } from './dto/add-skill.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Skills')
@Controller('api/v1')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Public()
  @Get('skills')
  @ApiOperation({ summary: 'Get all active skills from catalog' })
  async getAllSkills() {
    return this.skillsService.getAllSkills();
  }

  // Student Skills (informational)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('me/skills')
  @ApiOperation({ summary: 'Get current student known skills' })
  async getStudentSkills(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.getStudentSkills(user.studentId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('me/skills')
  @ApiOperation({ summary: 'Add a known skill to student profile' })
  async addStudentSkill(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddSkillDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.addStudentSkill(user.studentId, dto.skillId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('me/skills/:skillId')
  @ApiOperation({ summary: 'Remove a known skill from student profile' })
  async removeStudentSkill(
    @CurrentUser() user: AuthUser,
    @Param('skillId') skillId: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.removeStudentSkill(user.studentId, skillId);
  }

  // Tutor Pro Skills (used for matching)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('tutor/pro-skills')
  @ApiOperation({ summary: 'Get configured pro skills for tutoring' })
  async getTutorProSkills(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.getTutorProSkills(user.studentId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Put('tutor/pro-skills')
  @ApiOperation({ summary: 'Set/replace all tutor pro skills' })
  async setTutorProSkills(
    @CurrentUser() user: AuthUser,
    @Body() dto: SetProSkillsDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.setTutorProSkills(user.studentId, dto.skillIds);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('tutor/pro-skills')
  @ApiOperation({ summary: 'Add single pro skill for tutoring' })
  async addTutorProSkill(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddSkillDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.addTutorProSkill(user.studentId, dto.skillId);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Delete('tutor/pro-skills/:skillId')
  @ApiOperation({ summary: 'Remove a pro skill from tutoring profile' })
  async removeTutorProSkill(
    @CurrentUser() user: AuthUser,
    @Param('skillId') skillId: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.skillsService.removeTutorProSkill(user.studentId, skillId);
  }
}
