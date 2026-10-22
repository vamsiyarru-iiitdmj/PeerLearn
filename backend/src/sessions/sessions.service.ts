import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';
import { BookSessionDto } from './dto/book-session.dto';
import { SendMessageDto, RequestReplacementDto } from './dto/send-message.dto';

@Injectable()
export class SessionsService {
  constructor(private insforgeService: InsforgeService) {}

  async bookDoubt(doubtId: string, tutorStudentId: string, dto: BookSessionDto) {
    const admin = this.insforgeService.getAdminClient();

    // Scheduling check
    const start = new Date(dto.scheduledStart);
    const end = new Date(dto.scheduledEnd);
    if (end <= start) {
      throw new BadRequestException('Scheduled end time must be after start time');
    }

    // Call PostgreSQL atomic booking RPC function with row-level lock
    const { data: rpcRes, error: rpcErr } = await admin.database.rpc('book_doubt_atomic', {
      p_doubt_id: doubtId,
      p_tutor_id: tutorStudentId,
      p_scheduled_start: dto.scheduledStart,
      p_scheduled_end: dto.scheduledEnd,
      p_mode: dto.mode,
      p_venue: dto.venue || null,
      p_meeting_url: dto.meetingUrl || null,
    });

    if (rpcErr) {
      throw new BadRequestException(`Booking error: ${rpcErr.message}`);
    }

    if (!rpcRes?.success) {
      throw new ConflictException({
        code: 'DOUBT_ALREADY_BOOKED',
        message: rpcRes?.message || 'This doubt has already been booked by another tutor or is no longer available.',
      });
    }

    // Retrieve created session with student and doubt details
    const sessionId = rpcRes.sessionId || rpcRes.session_id;
    const session = await this.getSessionById(sessionId, tutorStudentId);

    // Create system notification for the student
    await admin.database.from('notifications').insert([
      {
        user_id: session.student_id,
        type: 'SESSION_BOOKED',
        title: 'Doubt Booked by Tutor!',
        body: `A peer tutor has accepted your doubt and scheduled a session for ${new Date(dto.scheduledStart).toLocaleString()}.`,
        entity_type: 'SESSION',
        entity_id: session.id,
      },
    ]);

    return {
      id: session.id,
      ...session,
      message: 'Session successfully booked (atomic winner confirmation)',
      session,
    };
  }

  async getSessions(studentId: string, mode?: 'student' | 'tutor') {
    const admin = this.insforgeService.getAdminClient();

    let query = admin.database
      .from('sessions')
      .select(`
        *,
        doubts!doubt_id (id, description, expected_outcome),
        student:student_id (id, full_name, roll_number, photo_url, department),
        tutor:tutor_id (id, full_name, roll_number, photo_url, department)
      `)
      .order('scheduled_start', { ascending: false });

    if (mode === 'tutor') {
      query = query.eq('tutor_id', studentId);
    } else if (mode === 'student') {
      query = query.eq('student_id', studentId);
    } else {
      query = query.or(`student_id.eq.${studentId},tutor_id.eq.${studentId}`);
    }

    const { data: sessions, error } = await query;
    if (error) {
      throw new BadRequestException(`Failed to retrieve sessions: ${error.message}`);
    }

    return sessions || [];
  }

  async getSessionById(sessionId: string, currentStudentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: sessions, error } = await admin.database
      .from('sessions')
      .select(`
        *,
        doubts!doubt_id (id, description, expected_outcome),
        student:student_id (id, full_name, roll_number, photo_url, department),
        tutor:tutor_id (id, full_name, roll_number, photo_url, department),
        session_ratings (id, rating, is_released)
      `)
      .eq('id', sessionId)
      .limit(1);

    if (error || !sessions || sessions.length === 0) {
      throw new NotFoundException('Session not found');
    }

    const session = sessions[0];

    // Verify requester has access (either student or tutor or replacement tutor)
    if (
      session.student_id !== currentStudentId &&
      session.tutor_id !== currentStudentId &&
      session.replacement_tutor_id !== currentStudentId
    ) {
      throw new ForbiddenException('You do not have permission to view this session');
    }

    // Never leak individual rating to tutor!
    if (session.tutor_id === currentStudentId && session.session_ratings) {
      delete session.session_ratings;
    }

    const normalizedStatus = session.status === 'COMPLETED_PENDING_CONFIRMATION'
      ? 'SESSION_COMPLETED_PENDING_CONFIRMATION'
      : session.status;

    return {
      ...session,
      status: normalizedStatus,
      dbStatus: session.status,
    };
  }

  async completeSession(sessionId: string, tutorStudentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: session } = await admin.database
      .from('sessions')
      .select('id, tutor_id, student_id, status, doubt_id')
      .eq('id', sessionId)
      .single();

    if (!session) throw new NotFoundException('Session not found');
    if (session.tutor_id !== tutorStudentId) {
      throw new ForbiddenException('Only the session tutor can mark completion');
    }

    const { data: updated, error } = await admin.database
      .from('sessions')
      .update({
        status: 'COMPLETED_PENDING_CONFIRMATION',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to complete session: ${error.message}`);

    // Update doubt status
    await admin.database
      .from('doubts')
      .update({ status: 'SESSION_COMPLETED_PENDING_CONFIRMATION' })
      .eq('id', session.doubt_id);

    // Send completion message in session chat
    await admin.database.from('session_messages').insert([
      {
        session_id: sessionId,
        sender_id: tutorStudentId,
        message_type: 'SESSION_COMPLETED',
        body: 'The tutor has marked this session as complete. Please confirm and leave a private rating!',
      },
    ]);

    // Send notification to student
    await admin.database.from('notifications').insert([
      {
        user_id: session.student_id,
        type: 'SESSION_COMPLETED_FORM',
        title: 'Confirm Session Completion & Rate Tutor',
        body: 'Your tutor marked the session complete. Please confirm whether the session took place and share your feedback.',
        entity_type: 'SESSION',
        entity_id: sessionId,
      },
    ]);

    return {
      id: updated.id,
      ...updated,
      status: 'SESSION_COMPLETED_PENDING_CONFIRMATION',
      message: 'Session marked as complete. Awaiting student confirmation and rating.',
      session: {
        ...updated,
        status: 'SESSION_COMPLETED_PENDING_CONFIRMATION',
      },
    };
  }

  async confirmSession(sessionId: string, studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { data: session } = await admin.database
      .from('sessions')
      .select('id, student_id, status, doubt_id')
      .eq('id', sessionId)
      .single();

    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) {
      throw new ForbiddenException('Only the student can confirm session completion');
    }

    const { data: updated, error } = await admin.database
      .from('sessions')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to confirm session: ${error.message}`);

    // Mark doubt as solved
    if (session.doubt_id) {
      await admin.database
        .from('doubts')
        .update({ status: 'SOLVED', closed_at: new Date().toISOString() })
        .eq('id', session.doubt_id);
    }

    return {
      id: updated.id,
      ...updated,
      status: 'CONFIRMED',
      message: 'Session confirmed as successfully held',
      session: updated,
    };
  }

  async requestReplacement(sessionId: string, tutorStudentId: string, dto: RequestReplacementDto) {
    const admin = this.insforgeService.getAdminClient();

    const { data: session } = await admin.database
      .from('sessions')
      .select('id, tutor_id, student_id, status')
      .eq('id', sessionId)
      .single();

    if (!session) throw new NotFoundException('Session not found');
    if (session.tutor_id !== tutorStudentId) {
      throw new ForbiddenException('Only the session tutor can request replacement');
    }

    const { data: updated, error } = await admin.database
      .from('sessions')
      .update({
        cancel_reason: dto.reason,
        replacement_tutor_id: dto.replacementTutorId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to record replacement request: ${error.message}`);

    // Post to session chat
    await admin.database.from('session_messages').insert([
      {
        session_id: sessionId,
        sender_id: tutorStudentId,
        message_type: 'REPLACEMENT_REQUEST',
        body: `Replacement notice: ${dto.reason}`,
      },
    ]);

    return { message: 'Replacement request recorded and student notified', session: updated };
  }

  async sendMessage(sessionId: string, senderStudentId: string, dto: SendMessageDto) {
    const session = await this.getSessionById(sessionId, senderStudentId);
    const admin = this.insforgeService.getAdminClient();

    const { data: msg, error } = await admin.database
      .from('session_messages')
      .insert([
        {
          session_id: sessionId,
          sender_id: senderStudentId,
          message_type: dto.messageType || 'TEXT',
          body: dto.body,
          resource_id: dto.resourceId || null,
        },
      ])
      .select(`
        *,
        sender:sender_id (id, full_name, roll_number, photo_url)
      `)
      .single();

    if (error) throw new BadRequestException(`Failed to send message: ${error.message}`);

    return msg;
  }

  async getMessages(sessionId: string, currentStudentId: string) {
    await this.getSessionById(sessionId, currentStudentId);
    const admin = this.insforgeService.getAdminClient();

    const { data: messages, error } = await admin.database
      .from('session_messages')
      .select(`
        *,
        sender:sender_id (id, full_name, roll_number, photo_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(`Failed to fetch messages: ${error.message}`);

    return messages || [];
  }
}
