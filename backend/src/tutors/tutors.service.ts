import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class TutorsService {
  constructor(private insforgeService: InsforgeService) {}

  async getTutorProfile(studentId: string) {
    const admin = this.insforgeService.getAdminClient();

    // Fetch student info
    const { data: student } = await admin.database
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (!student) throw new NotFoundException('Student profile not found');

    // Fetch tutor pro skills
    const { data: proSkills } = await admin.database
      .from('tutor_pro_skills')
      .select('skills (id, name, slug, category)')
      .eq('student_id', studentId);

    // Fetch solved doubts count
    const { count: solvedCount } = await admin.database
      .from('doubts')
      .select('id', { count: 'exact', head: true })
      .eq('booked_tutor_id', studentId)
      .eq('status', 'SOLVED');

    // Fetch latest proficiency score snapshot
    const { data: snapshots } = await admin.database
      .from('tutor_score_snapshots')
      .select('score, rank')
      .eq('tutor_id', studentId)
      .order('calculated_at', { ascending: false })
      .limit(1);

    const proficiencyScore = snapshots && snapshots.length > 0 ? Number(snapshots[0].score) : 4.8;
    const rank = snapshots && snapshots.length > 0 ? snapshots[0].rank : null;

    // System-derived experience (months since first session or pro skills added)
    const { data: firstSession } = await admin.database
      .from('sessions')
      .select('created_at')
      .eq('tutor_id', studentId)
      .order('created_at', { ascending: true })
      .limit(1);

    let experienceMonths = 1;
    const startDate = firstSession && firstSession.length > 0
      ? new Date(firstSession[0].created_at)
      : new Date(student.created_at);

    const diffMonths = Math.max(
      1,
      Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4)),
    );
    experienceMonths = diffMonths;

    return {
      tutor: {
        id: student.id,
        fullName: student.full_name,
        rollNumber: student.roll_number,
        department: student.department,
        yearOfStudy: student.year_of_study,
        phone: student.phone,
        photoUrl: student.photo_url,
      },
      proficiencyScore,
      doubtsSolved: solvedCount || 0,
      experience: `${experienceMonths} ${experienceMonths === 1 ? 'month' : 'months'}`,
      rank,
      masteredSkills: (proSkills || []).map((p: any) => p.skills).filter(Boolean),
    };
  }

  async getLeaderboard(currentStudentId?: string) {
    const admin = this.insforgeService.getAdminClient();

    // Query tutors with pro skills
    const { data: tutors } = await admin.database
      .from('tutor_pro_skills')
      .select('student_id, students (id, full_name, roll_number, photo_url, department)');

    if (!tutors || tutors.length === 0) {
      return { leaderboard: [], currentTutorPosition: null };
    }

    const uniqueMap = new Map<string, any>();
    for (const t of tutors) {
      if (t.students && !uniqueMap.has(t.student_id)) {
        uniqueMap.set(t.student_id, t.students);
      }
    }

    // Fetch latest score snapshots
    const { data: snapshots } = await admin.database
      .from('tutor_score_snapshots')
      .select('tutor_id, score, calculated_at')
      .order('calculated_at', { ascending: false });

    const scoreMap = new Map<string, number>();
    for (const s of snapshots || []) {
      if (!scoreMap.has(s.tutor_id)) {
        scoreMap.set(s.tutor_id, Number(s.score));
      }
    }

    // Fetch doubts solved per tutor
    const { data: solvedRows } = await admin.database
      .from('doubts')
      .select('booked_tutor_id')
      .eq('status', 'SOLVED');

    const solvedCounts = new Map<string, number>();
    for (const r of solvedRows || []) {
      if (r.booked_tutor_id) {
        solvedCounts.set(r.booked_tutor_id, (solvedCounts.get(r.booked_tutor_id) || 0) + 1);
      }
    }

    // Build ranking
    const entries = Array.from(uniqueMap.values()).map((s: any) => {
      const score = scoreMap.get(s.id) || 4.8;
      const solved = solvedCounts.get(s.id) || 0;
      // Award points formula: Solved doubts * 50 + score * 20
      const awardPoints = Math.round(solved * 50 + score * 20);
      return {
        tutorId: s.id,
        fullName: s.full_name,
        rollNumber: s.roll_number,
        department: s.department,
        photoUrl: s.photo_url,
        proficiencyScore: score,
        doubtsSolved: solved,
        awardPoints,
      };
    });

    entries.sort((a, b) => b.proficiencyScore - a.proficiencyScore || b.doubtsSolved - a.doubtsSolved);

    const ranked = entries.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    let currentTutorPosition = null;
    if (currentStudentId) {
      const myRank = ranked.find((r) => r.tutorId === currentStudentId);
      if (myRank) {
        currentTutorPosition = myRank;
      }
    }

    return {
      leaderboard: ranked,
      currentTutorPosition,
    };
  }
}
