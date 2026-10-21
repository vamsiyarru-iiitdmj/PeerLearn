import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AskSuggestionDto, RespondSuggestionDto, UsePlanDto } from './dto/ask-suggestion.dto';

@Injectable()
export class PlannerService {
  constructor(private insforgeService: InsforgeService) {}

  async getMyTasks(studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: tasks, error } = await admin.database
      .from('tasks')
      .select(`
        *,
        task_subtasks (id, title, is_completed, step_order),
        suggestion_requests (id, query, time_available, status)
      `)
      .eq('student_id', studentId)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to retrieve tasks: ${error.message}`);

    return tasks || [];
  }

  async createTask(studentId: string, dto: CreateTaskDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: task, error } = await admin.database
      .from('tasks')
      .insert([
        {
          student_id: studentId,
          title: dto.title.trim(),
          context: dto.context?.trim() || null,
          due_at: dto.dueAt || null,
          priority: dto.priority || 'MEDIUM',
          is_tough: dto.isTough || false,
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create task: ${error.message}`);
    return task;
  }

  async toggleTaskComplete(taskId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: task } = await admin.database
      .from('tasks')
      .select('id, student_id, status')
      .eq('id', taskId)
      .single();

    if (!task) throw new NotFoundException('Task not found');
    if (task.student_id !== studentId) throw new ForbiddenException('Forbidden');

    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const completedAt = nextStatus === 'COMPLETED' ? new Date().toISOString() : null;

    const { data: updated, error } = await admin.database
      .from('tasks')
      .update({
        status: nextStatus,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to toggle task: ${error.message}`);
    return updated;
  }

  async toggleTaskTough(taskId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: task } = await admin.database
      .from('tasks')
      .select('id, student_id, is_tough')
      .eq('id', taskId)
      .single();

    if (!task) throw new NotFoundException('Task not found');
    if (task.student_id !== studentId) throw new ForbiddenException('Forbidden');

    const { data: updated, error } = await admin.database
      .from('tasks')
      .update({
        is_tough: !task.is_tough,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update tough flag: ${error.message}`);
    return updated;
  }

  async deleteTask(taskId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: task } = await admin.database
      .from('tasks')
      .select('id, student_id')
      .eq('id', taskId)
      .single();

    if (!task) throw new NotFoundException('Task not found');
    if (task.student_id !== studentId) throw new ForbiddenException('Forbidden');

    await admin.database.from('tasks').delete().eq('id', taskId);
    return { message: 'Task deleted successfully' };
  }

  // --- Ask Suggestion Flow ---

  async askSuggestion(taskId: string, studentId: string, dto: AskSuggestionDto) {
    const admin = this.insforgeService.getAdminClient();

    // Verify task ownership
    const { data: task } = await admin.database
      .from('tasks')
      .select('id, student_id, title')
      .eq('id', taskId)
      .single();

    if (!task) throw new NotFoundException('Task not found');
    if (task.student_id !== studentId) throw new ForbiddenException('Forbidden');

    // Mark task as tough
    await admin.database
      .from('tasks')
      .update({ is_tough: true })
      .eq('id', taskId);

    // Create suggestion request
    const { data: request, error } = await admin.database
      .from('suggestion_requests')
      .insert([
        {
          task_id: taskId,
          student_id: studentId,
          query: dto.query.trim(),
          time_available: dto.timeAvailable?.trim() || null,
          status: 'OPEN',
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create suggestion request: ${error.message}`);

    return {
      message: 'Suggestion request dispatched to expert peer tutors',
      request,
    };
  }

  async getSuggestionsForTutor() {
    const admin = this.insforgeService.getAdminClient();

    const { data: requests, error } = await admin.database
      .from('suggestion_requests')
      .select(`
        *,
        tasks (id, title, context, priority, due_at),
        students:student_id (id, full_name, roll_number, department, year_of_study),
        suggestion_responses (
          id, title, description, steps,
          tutor:tutor_id (id, full_name, roll_number)
        )
      `)
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(`Failed to retrieve suggestions: ${error.message}`);
    return requests || [];
  }

  async getSuggestionDetails(requestId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: request, error } = await admin.database
      .from('suggestion_requests')
      .select(`
        *,
        tasks (id, title, context, priority, due_at),
        students:student_id (id, full_name, roll_number, department),
        suggestion_responses (
          id, title, description, steps, is_selected, created_at,
          tutor:tutor_id (id, full_name, roll_number, photo_url)
        )
      `)
      .eq('id', requestId)
      .single();

    if (error || !request) throw new NotFoundException('Suggestion request not found');
    return request;
  }

  async respondToSuggestion(requestId: string, tutorStudentId: string, dto: RespondSuggestionDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: request } = await admin.database
      .from('suggestion_requests')
      .select('id, status')
      .eq('id', requestId)
      .single();

    if (!request) throw new NotFoundException('Suggestion request not found');
    if (request.status !== 'OPEN') throw new BadRequestException('Suggestion request is no longer open');

    const { data: response, error } = await admin.database
      .from('suggestion_responses')
      .insert([
        {
          request_id: requestId,
          tutor_id: tutorStudentId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          steps: dto.steps,
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to submit suggestion plan: ${error.message}`);

    return {
      message: 'Workflow suggestion plan submitted for student review',
      response,
    };
  }

  async usePlan(requestId: string, studentId: string, dto: UsePlanDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: request } = await admin.database
      .from('suggestion_requests')
      .select('id, task_id, student_id')
      .eq('id', requestId)
      .single();

    if (!request) throw new NotFoundException('Suggestion request not found');
    if (request.student_id !== studentId) throw new ForbiddenException('Forbidden');

    // Fetch the response
    const { data: plan } = await admin.database
      .from('suggestion_responses')
      .select('id, steps')
      .eq('id', dto.responseId)
      .eq('request_id', requestId)
      .single();

    if (!plan) throw new NotFoundException('Suggestion response plan not found');

    // Mark plan as selected
    await admin.database
      .from('suggestion_responses')
      .update({ is_selected: true })
      .eq('id', plan.id);

    // Convert steps into task subtasks
    const stepsArray = Array.isArray(plan.steps) ? plan.steps : [];
    if (stepsArray.length > 0) {
      const subtaskInserts = stepsArray.map((stepText: string, idx: number) => ({
        task_id: request.task_id,
        title: stepText,
        step_order: idx + 1,
        is_completed: false,
      }));

      await admin.database.from('task_subtasks').insert(subtaskInserts);
    }

    // Mark suggestion request fulfilled
    await admin.database
      .from('suggestion_requests')
      .update({ status: 'FULFILLED', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    return {
      message: 'Plan adopted! Actionable workflow steps converted into task subtasks.',
      stepsCount: stepsArray.length,
    };
  }
}
