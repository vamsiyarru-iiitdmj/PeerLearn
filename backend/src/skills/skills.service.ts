import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class SkillsService {
  constructor(private insforgeService: InsforgeService) {}

  async getAllSkills() {
    const admin = this.insforgeService.getAdminClient();
    const { data: skills, error } = await admin.database
      .from('skills')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch skills catalog: ${error.message}`);
    }
    return skills || [];
  }

  async getStudentSkills(studentId: string) {
    const admin = this.insforgeService.getAdminClient();
    const { data, error } = await admin.database
      .from('student_skills')
      .select('skills (id, name, slug, category, is_active)')
      .eq('student_id', studentId);

    if (error) {
      throw new BadRequestException(`Failed to fetch student skills: ${error.message}`);
    }
    return (data || []).map((row: any) => row.skills).filter(Boolean);
  }

  async addStudentSkill(studentId: string, skillId: string) {
    const admin = this.insforgeService.getAdminClient();

    // Check if skill exists
    const { data: skill } = await admin.database
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .single();

    if (!skill) {
      throw new NotFoundException('Skill not found in catalog');
    }

    const { data, error } = await admin.database
      .from('student_skills')
      .insert([{ student_id: studentId, skill_id: skillId }])
      .select();

    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        throw new ConflictException('Skill already added to your student profile');
      }
      throw new BadRequestException(error.message);
    }
    return { message: 'Skill added to student profile', skillId };
  }

  async removeStudentSkill(studentId: string, skillId: string) {
    const admin = this.insforgeService.getAdminClient();
    await admin.database
      .from('student_skills')
      .delete()
      .eq('student_id', studentId)
      .eq('skill_id', skillId);

    return { message: 'Skill removed from student profile' };
  }

  async getTutorProSkills(studentId: string) {
    const admin = this.insforgeService.getAdminClient();
    const { data, error } = await admin.database
      .from('tutor_pro_skills')
      .select('skills (id, name, slug, category, is_active)')
      .eq('student_id', studentId);

    if (error) {
      throw new BadRequestException(`Failed to fetch tutor pro skills: ${error.message}`);
    }
    return (data || []).map((row: any) => row.skills).filter(Boolean);
  }

  async setTutorProSkills(studentId: string, skillIds: string[]) {
    const admin = this.insforgeService.getAdminClient();

    // Remove existing
    await admin.database
      .from('tutor_pro_skills')
      .delete()
      .eq('student_id', studentId);

    if (skillIds.length > 0) {
      const inserts = skillIds.map((skillId) => ({
        student_id: studentId,
        skill_id: skillId,
      }));
      const { error } = await admin.database.from('tutor_pro_skills').insert(inserts);
      if (error) {
        throw new BadRequestException(`Failed to set tutor pro skills: ${error.message}`);
      }
    }

    return this.getTutorProSkills(studentId);
  }

  async addTutorProSkill(studentId: string, skillId: string) {
    const admin = this.insforgeService.getAdminClient();

    const { error } = await admin.database
      .from('tutor_pro_skills')
      .insert([{ student_id: studentId, skill_id: skillId }]);

    if (error) {
      if (error.message?.includes('duplicate') || error.code === '23505') {
        throw new ConflictException('Pro skill already selected');
      }
      throw new BadRequestException(error.message);
    }

    return { message: 'Pro skill added for tutoring', skillId };
  }

  async removeTutorProSkill(studentId: string, skillId: string) {
    const admin = this.insforgeService.getAdminClient();
    await admin.database
      .from('tutor_pro_skills')
      .delete()
      .eq('student_id', studentId)
      .eq('skill_id', skillId);

    return { message: 'Pro skill removed from tutoring profile' };
  }
}
