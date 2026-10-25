import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlannerService } from './planner.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AskSuggestionDto, RespondSuggestionDto, UsePlanDto } from './dto/ask-suggestion.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';

@ApiTags('Planner & Ask Suggestion')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('api/v1')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Get current student planner tasks with subtasks' })
  async getMyTasks(@CurrentUser() user: AuthUser) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.getMyTasks(user.studentId);
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a planner task' })
  async createTask(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.createTask(user.studentId, dto);
  }

  @Patch('tasks/:id/toggle')
  @ApiOperation({ summary: 'Toggle task completion status (PATCH)' })
  async toggleComplete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.toggleTaskComplete(id, user.studentId);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: 'Toggle task completion status (POST)' })
  async postComplete(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.toggleTaskComplete(id, user.studentId);
  }

  @Patch('tasks/:id/tough')
  @ApiOperation({ summary: 'Toggle tough flag on task (PATCH)' })
  async toggleTough(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.toggleTaskTough(id, user.studentId);
  }

  @Post('tasks/:id/toggle-tough')
  @ApiOperation({ summary: 'Toggle tough flag on task (POST)' })
  async postToggleTough(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.toggleTaskTough(id, user.studentId);
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete a task' })
  async deleteTask(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.deleteTask(id, user.studentId);
  }

  // --- Ask Suggestion ---

  @Post('tasks/:id/suggestions')
  @ApiOperation({ summary: 'Ask peer tutors for a recommended study plan/workflow on a tough task' })
  async askSuggestion(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Body() dto: AskSuggestionDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.askSuggestion(taskId, user.studentId, dto);
  }

  @Post('tasks/:id/ask-suggestion')
  @ApiOperation({ summary: 'Ask peer tutors for a recommended study plan (alias)' })
  async postAskSuggestion(
    @CurrentUser() user: AuthUser,
    @Param('id') taskId: string,
    @Body() dto: AskSuggestionDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.askSuggestion(taskId, user.studentId, dto);
  }

  @Get('tasks/suggestions/feed')
  @ApiOperation({ summary: 'Get open suggestion requests for tutors' })
  async getSuggestionsFeed() {
    return this.plannerService.getSuggestionsForTutor();
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get open suggestion requests for tutors (alias)' })
  async getSuggestions() {
    return this.plannerService.getSuggestionsForTutor();
  }

  @Get('suggestions/:id')
  @ApiOperation({ summary: 'Get suggestion request details and responses' })
  async getSuggestionDetails(@Param('id') id: string) {
    return this.plannerService.getSuggestionDetails(id);
  }

  @Post('suggestions/:id/respond')
  @ApiOperation({ summary: 'Tutor responds with a suggested step-by-step workflow plan' })
  async respondToSuggestion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondSuggestionDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.respondToSuggestion(id, user.studentId, dto);
  }

  @Post('suggestions/:id/use-plan')
  @ApiOperation({ summary: 'Student chooses a suggested plan; converts steps into subtasks' })
  async usePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UsePlanDto,
  ) {
    if (!user.studentId) throw new UnauthorizedException('Student profile required');
    return this.plannerService.usePlan(id, user.studentId, dto);
  }
}
