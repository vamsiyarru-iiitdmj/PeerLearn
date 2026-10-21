import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsforgeService } from '../insforge/insforge.service';
import { CreateDoubtDto } from './dto/create-doubt.dto';
import { QueryDoubtsDto } from './dto/query-doubts.dto';
import { UpdateExpiryDto } from './dto/update-expiry.dto';

@Injectable()
export class DoubtsService {
  private defaultExpiryHours: number;
  private maxExpiryHours: number;

  constructor(
    private insforgeService: InsforgeService,
    private configService: ConfigService,
  ) {
    this.defaultExpiryHours = Number(this.configService.get('DOUBT_DEFAULT_EXPIRY_HOURS', 24));
    this.maxExpiryHours = Number(this.configService.get('DOUBT_MAX_EXPIRY_HOURS', 168));
  }

  async createDoubt(studentId: string, dto: CreateDoubtDto) {
    const admin = this.insforgeService.getAdminClient();

    if (!dto.tagIds || dto.tagIds.length === 0) {
      throw new BadRequestException('At least one skill tag is required to post a doubt');
    }

    // Verify all skill IDs exist
    const { data: validSkills } = await admin.database
      .from('skills')
      .select('id, name')
      .in('id', dto.tagIds);

    if (!validSkills || validSkills.length !== dto.tagIds.length) {
      throw new BadRequestException('One or more selected skill tags are invalid');
    }

    const expiryHours = Math.min(
      dto.expiryHours || this.defaultExpiryHours,
      this.maxExpiryHours,
    );
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

    // Insert doubt
    const { data: doubt, error: doubtErr } = await admin.database
      .from('doubts')
      .insert([
        {
          student_id: studentId,
          description: dto.description.trim(),
          expected_outcome: dto.expectedOutcome.trim(),
          status: 'OPEN',
          expires_at: expiresAt,
        },
      ])
      .select()
      .single();

    if (doubtErr || !doubt) {
      throw new BadRequestException(`Failed to create doubt: ${doubtErr?.message}`);
    }

    // Insert doubt tags
    const tagInserts = dto.tagIds.map((skillId) => ({
      doubt_id: doubt.id,
      skill_id: skillId,
    }));

    await admin.database.from('doubt_tags').insert(tagInserts);

    return {
      message: 'Doubt published successfully to matching tutors',
      doubt: {
        ...doubt,
        tags: validSkills,
      },
    };
  }

  async getMyDoubts(studentId: string, query: QueryDoubtsDto) {
    const admin = this.insforgeService.getAdminClient();

    // Auto-close any expired doubts first
    try {
      await admin.database.rpc('close_expired_doubts');
    } catch (e) {
      // Ignore if already run
    }

    let dbQuery = admin.database
      .from('doubts')
      .select(`
        id,
        description,
        expected_outcome,
        status,
        expires_at,
        created_at,
        closed_at,
        booked_tutor_id,
        selected_session_id,
        doubt_tags (
          skills (id, name, slug, category)
        ),
        students:booked_tutor_id (
          id, full_name, roll_number, photo_url, department
        ),
        sessions:selected_session_id (
          id, scheduled_start, scheduled_end, mode, venue, meeting_url, status
        )
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (query.tab === 'solved') {
      dbQuery = dbQuery.in('status', ['SOLVED', 'BOOKED', 'SESSION_COMPLETED_PENDING_CONFIRMATION']);
    } else if (query.tab === 'unsolved') {
      dbQuery = dbQuery.eq('status', 'OPEN');
    }

    const { data: doubts, error } = await dbQuery;

    if (error) {
      throw new BadRequestException(`Failed to fetch doubts: ${error.message}`);
    }

    // Filter by tag if requested
    let results = (doubts || []).map((d: any) => ({
      id: d.id,
      description: d.description,
      expectedOutcome: d.expected_outcome,
      status: d.status,
      expiresAt: d.expires_at,
      createdAt: d.created_at,
      closedAt: d.closed_at,
      tags: (d.doubt_tags || []).map((dt: any) => dt.skills).filter(Boolean),
      tutor: d.students,
      session: d.sessions,
    }));

    if (query.tagId) {
      results = results.filter((r) => r.tags.some((t: any) => t.id === query.tagId));
    }

    return results;
  }

  async getDoubtById(doubtId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: doubts, error } = await admin.database
      .from('doubts')
      .select(`
        *,
        doubt_tags (
          skills (id, name, slug, category)
        ),
        students:student_id (
          id, full_name, roll_number, department, year_of_study, photo_url
        ),
        tutor:booked_tutor_id (
          id, full_name, roll_number, photo_url
        ),
        sessions:selected_session_id (
          id, scheduled_start, scheduled_end, mode, venue, meeting_url, status
        )
      `)
      .eq('id', doubtId)
      .limit(1);

    if (error || !doubts || doubts.length === 0) {
      throw new NotFoundException('Doubt not found');
    }

    const d = doubts[0];
    return {
      ...d,
      tags: (d.doubt_tags || []).map((dt: any) => dt.skills).filter(Boolean),
      student: d.students,
      tutor: d.tutor,
      session: d.sessions,
    };
  }

  async withdrawDoubt(doubtId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: doubt } = await admin.database
      .from('doubts')
      .select('id, student_id, status')
      .eq('id', doubtId)
      .single();

    if (!doubt) {
      throw new NotFoundException('Doubt not found');
    }

    if (doubt.student_id !== studentId) {
      throw new ForbiddenException('You can only withdraw your own doubts');
    }

    if (doubt.status !== 'OPEN') {
      throw new BadRequestException(`Cannot withdraw doubt in status: ${doubt.status}`);
    }

    const { data: updated, error } = await admin.database
      .from('doubts')
      .update({
        status: 'WITHDRAWN',
        closed_at: new Date().toISOString(),
      })
      .eq('id', doubtId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to withdraw doubt: ${error.message}`);
    }

    return { message: 'Doubt withdrawn successfully', doubt: updated };
  }

  async updateExpiry(doubtId: string, studentId: string, dto: UpdateExpiryDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: doubt } = await admin.database
      .from('doubts')
      .select('id, student_id, status')
      .eq('id', doubtId)
      .single();

    if (!doubt) {
      throw new NotFoundException('Doubt not found');
    }

    if (doubt.student_id !== studentId) {
      throw new ForbiddenException('You can only update your own doubts');
    }

    if (doubt.status !== 'OPEN') {
      throw new BadRequestException('Can only update expiry for open doubts');
    }

    const newExpiresAt = new Date(Date.now() + dto.additionalHours * 60 * 60 * 1000).toISOString();

    const { data: updated, error } = await admin.database
      .from('doubts')
      .update({
        expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doubtId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update expiry: ${error.message}`);
    }

    return { message: 'Expiry updated successfully', expiresAt: newExpiresAt, doubt: updated };
  }
}
