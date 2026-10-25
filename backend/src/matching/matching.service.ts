import { Injectable, BadRequestException } from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class MatchingService {
  constructor(private insforgeService: InsforgeService) {}

  async getMatchingDoubtsForTutor(tutorStudentId: string) {
    const admin = this.insforgeService.getAdminClient();

    // 1. Close any expired doubts
    try {
      await admin.database.rpc('close_expired_doubts');
    } catch (e) {
      // safe fallback
    }

    // 2. Call the PostgreSQL RPC enforcing strict ALL-tags matching rule
    const { data: matchedRows, error } = await admin.database.rpc(
      'get_matching_doubts_for_tutor',
      { p_tutor_id: tutorStudentId },
    );

    if (error) {
      throw new BadRequestException(`Failed to retrieve matched doubts: ${error.message}`);
    }

    if (!matchedRows || matchedRows.length === 0) {
      return [];
    }

    const doubtIds = matchedRows.map((r: any) => r.id || r.doubt_id);

    // 3. Fetch full doubt details with tags and student profile
    const { data: fullDoubts } = await admin.database
      .from('doubts')
      .select(`
        id,
        description,
        expected_outcome,
        status,
        expires_at,
        created_at,
        doubt_tags (
          skills (id, name, slug, category)
        ),
        students:student_id (
          id, full_name, roll_number, department, year_of_study, photo_url
        )
      `)
      .in('id', doubtIds)
      .eq('status', 'OPEN')
      .order('created_at', { ascending: false });

    return (fullDoubts || []).map((d: any) => ({
      id: d.id,
      description: d.description,
      expectedOutcome: d.expected_outcome,
      status: d.status,
      expiresAt: d.expires_at,
      createdAt: d.created_at,
      tags: (d.doubt_tags || []).map((dt: any) => dt.skills).filter(Boolean),
      student: d.students,
    }));
  }

  async getTagStats(skillIds: string[]) {
    if (!skillIds || skillIds.length === 0) {
      return {
        eligibleTutorCount: 0,
        avgProficiency: 0,
        maxProficiency: 0,
      };
    }

    const admin = this.insforgeService.getAdminClient();

    // Query tutor_pro_skills for each skillId to find tutors having ALL skillIds
    const { data: proRows } = await admin.database
      .from('tutor_pro_skills')
      .select('student_id, skill_id')
      .in('skill_id', skillIds);

    if (!proRows || proRows.length === 0) {
      return {
        eligibleTutorCount: 0,
        avgProficiency: 4.5,
        maxProficiency: 5.0,
      };
    }

    // Group by student_id
    const tutorSkillCounts = new Map<string, Set<string>>();
    for (const row of proRows) {
      if (!tutorSkillCounts.has(row.student_id)) {
        tutorSkillCounts.set(row.student_id, new Set());
      }
      tutorSkillCounts.get(row.student_id)!.add(row.skill_id);
    }

    // Filter tutors who possess ALL required skills
    const eligibleTutorIds: string[] = [];
    for (const [studentId, skillsSet] of tutorSkillCounts.entries()) {
      const hasAll = skillIds.every((sId) => skillsSet.has(sId));
      if (hasAll) {
        eligibleTutorIds.push(studentId);
      }
    }

    const eligibleTutorCount = eligibleTutorIds.length;

    if (eligibleTutorCount === 0) {
      return {
        eligibleTutorCount: 0,
        avgProficiency: 0,
        maxProficiency: 0,
      };
    }

    // Fetch scores from tutor_score_snapshots
    const { data: scoreRows } = await admin.database
      .from('tutor_score_snapshots')
      .select('tutor_id, score')
      .in('tutor_id', eligibleTutorIds);

    const scoreMap = new Map<string, number>();
    (scoreRows || []).forEach((r: any) => scoreMap.set(r.tutor_id, Number(r.score)));

    const scores = eligibleTutorIds.map((id) => scoreMap.get(id) || 4.5);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Number((sum / scores.length).toFixed(1));
    const max = Number(Math.max(...scores).toFixed(1));

    return {
      eligibleTutorCount,
      avgProficiency: avg,
      maxProficiency: max,
    };
  }
}
