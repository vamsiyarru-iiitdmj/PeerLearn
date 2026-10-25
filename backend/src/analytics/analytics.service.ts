import { Injectable, BadRequestException } from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class AnalyticsService {
  private readonly PRIVACY_THRESHOLD = 10;

  constructor(private insforgeService: InsforgeService) {}

  async getOverview() {
    const admin = this.insforgeService.getAdminClient();

    // Total doubts
    const { count: totalDoubts } = await admin.database
      .from('doubts')
      .select('id', { count: 'exact', head: true });

    // Solved doubts
    const { count: solvedDoubts } = await admin.database
      .from('doubts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SOLVED');

    // Total tutors
    const { data: tutors } = await admin.database
      .from('tutor_pro_skills')
      .select('student_id');

    const uniqueTutors = new Set((tutors || []).map((t: any) => t.student_id)).size;

    // Total shared resources
    const { count: totalResources } = await admin.database
      .from('shared_resources')
      .select('id', { count: 'exact', head: true });

    const total = totalDoubts || 0;
    const solved = solvedDoubts || 0;
    const solveRate = total > 0 ? Number(((solved / total) * 100).toFixed(1)) : 0;

    return {
      totalDoubts: total,
      solvedDoubts: solved,
      solvedPercentage: solveRate,
      activeTutors: uniqueTutors || 0,
      sharedResourcesCount: totalResources || 0,
    };
  }

  async getDoubtsByMonth() {
    const admin = this.insforgeService.getAdminClient();

    const { data: doubts } = await admin.database
      .from('doubts')
      .select('created_at, status');

    // Group by month
    const monthsMap = new Map<string, { asked: number; solved: number }>();
    const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const d of doubts || []) {
      const date = new Date(d.created_at);
      const mName = monthsOrder[date.getMonth()];
      if (!monthsMap.has(mName)) {
        monthsMap.set(mName, { asked: 0, solved: 0 });
      }
      const entry = monthsMap.get(mName)!;
      entry.asked++;
      if (d.status === 'SOLVED') entry.solved++;
    }

    if (monthsMap.size === 0) {
      const currentMonth = monthsOrder[new Date().getMonth()];
      return [
        { month: currentMonth, asked: 0, solved: 0 },
      ];
    }

    return Array.from(monthsMap.entries()).map(([month, stats]) => ({
      month,
      ...stats,
    }));
  }

  async getDoubtsBySkill() {
    const admin = this.insforgeService.getAdminClient();

    const { data: tags, error } = await admin.database
      .from('doubt_tags')
      .select(`
        skill_id,
        skills (id, name, slug, category),
        doubts (id, status)
      `);

    if (error) throw new BadRequestException(`Failed to retrieve skill trends: ${error.message}`);

    const skillMap = new Map<string, { name: string; category: string; count: number; solved: number }>();

    for (const row of tags || []) {
      if (!row.skills) continue;
      const sId = row.skill_id;
      if (!skillMap.has(sId)) {
        skillMap.set(sId, {
          name: row.skills.name,
          category: row.skills.category,
          count: 0,
          solved: 0,
        });
      }
      const entry = skillMap.get(sId)!;
      entry.count++;
      if (row.doubts?.status === 'SOLVED') {
        entry.solved++;
      }
    }

    const result = Array.from(skillMap.values()).sort((a, b) => b.count - a.count);

    if (result.length === 0) {
      const { data: defaultSkills } = await admin.database
        .from('skills')
        .select('name, category')
        .limit(5);

      return (defaultSkills || []).map((s: any) => ({
        name: s.name,
        category: s.category || 'General',
        count: 0,
        solved: 0,
      }));
    }

    return result;
  }

  async getDoubtsByYear() {
    const admin = this.insforgeService.getAdminClient();

    const { data: doubts, error } = await admin.database
      .from('doubts')
      .select(`
        id,
        students:student_id (year_of_study)
      `);

    if (error) throw new BadRequestException(`Failed to retrieve year trends: ${error.message}`);

    const yearCounts = new Map<number, number>();
    for (const d of doubts || []) {
      const year = d.students?.year_of_study || 2;
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
    }

    const yearLabels: Record<number, string> = {
      1: '1st Year (Freshmen)',
      2: '2nd Year (Sophomores)',
      3: '3rd Year (Juniors)',
      4: '4th Year (Seniors)',
    };

    // PRIVACY SUPPRESSION RULE: If total cohort participating in doubt activity < 10, suppress count
    const result = [1, 2, 3, 4].map((yr) => {
      const count = yearCounts.get(yr) || 0;
      if (count > 0 && count < this.PRIVACY_THRESHOLD) {
        return {
          year: yr,
          label: yearLabels[yr],
          count: null,
          isSuppressedForPrivacy: true,
          message: 'Cohort count < 10 suppressed to maintain student privacy',
        };
      }
      return {
        year: yr,
        label: yearLabels[yr],
        count: count,
        isSuppressedForPrivacy: false,
      };
    });

    return result;
  }

  async getTutorSupplyVsDemand() {
    const admin = this.insforgeService.getAdminClient();

    // 1. Demand (doubts per skill)
    const { data: doubtTags } = await admin.database
      .from('doubt_tags')
      .select('skill_id, skills (name)');

    const demandMap = new Map<string, { name: string; doubtsAsked: number }>();
    for (const dt of doubtTags || []) {
      if (!dt.skills) continue;
      if (!demandMap.has(dt.skill_id)) {
        demandMap.set(dt.skill_id, { name: dt.skills.name, doubtsAsked: 0 });
      }
      demandMap.get(dt.skill_id)!.doubtsAsked++;
    }

    // 2. Supply (tutors per pro skill)
    const { data: proSkills } = await admin.database
      .from('tutor_pro_skills')
      .select('skill_id, student_id, skills (name)');

    const supplyMap = new Map<string, number>();
    for (const ps of proSkills || []) {
      supplyMap.set(ps.skill_id, (supplyMap.get(ps.skill_id) || 0) + 1);
    }

    const comparison = Array.from(demandMap.entries()).map(([skillId, data]) => {
      const tutorsAvailable = supplyMap.get(skillId) || 0;
      return {
        skillId,
        skillName: data.name,
        demand: data.doubtsAsked,
        supply: tutorsAvailable,
        ratio: tutorsAvailable > 0 ? Number((data.doubtsAsked / tutorsAvailable).toFixed(2)) : data.doubtsAsked,
      };
    });

    comparison.sort((a, b) => b.demand - a.demand);

    if (comparison.length === 0) {
      const { data: defaultSkills } = await admin.database
        .from('skills')
        .select('name')
        .limit(4);

      return (defaultSkills || []).map((s: any) => ({
        skillName: s.name,
        demand: 0,
        supply: 0,
        ratio: 0,
      }));
    }

    return comparison;
  }
}
