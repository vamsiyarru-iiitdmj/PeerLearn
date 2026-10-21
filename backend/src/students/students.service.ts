import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTargetDto } from './dto/update-target.dto';

@Injectable()
export class StudentsService {
  constructor(private insforgeService: InsforgeService) {}

  async getStudentByAuthId(authUserId: string) {
    const admin = this.insforgeService.getAdminClient();
    const { data: students, error } = await admin.database
      .from('students')
      .select('*')
      .eq('auth_user_id', authUserId)
      .limit(1);

    if (error || !students || students.length === 0) {
      throw new NotFoundException('Student profile not found');
    }
    return students[0];
  }

  async getDetailedProfile(authUserId: string) {
    const student = await this.getStudentByAuthId(authUserId);
    const admin = this.insforgeService.getAdminClient();

    // Fetch official academic record
    const { data: acadRecords } = await admin.database
      .from('academic_records')
      .select('*')
      .eq('roll_number', student.roll_number)
      .order('semester', { ascending: true });

    // Fetch student's general skills
    const { data: studentSkills } = await admin.database
      .from('student_skills')
      .select('skills (id, name, slug, category)')
      .eq('student_id', student.id);

    // Fetch tutor pro skills if any
    const { data: tutorSkills } = await admin.database
      .from('tutor_pro_skills')
      .select('skills (id, name, slug, category)')
      .eq('student_id', student.id);

    // Compute Target CGPA statistics
    const latestAcad = acadRecords && acadRecords.length > 0 ? acadRecords[acadRecords.length - 1] : null;
    const currentCgpa = latestAcad?.cgpa || 0;
    const completedSem = latestAcad?.semester || 1;
    const totalSem = student.programme?.toLowerCase().includes('m.tech') ? 4 : 8;
    const remainingSem = Math.max(0, totalSem - completedSem);

    let requiredAverageCpi: number | null = null;
    if (student.target_cgpa && remainingSem > 0) {
      const neededTotal = student.target_cgpa * totalSem;
      const earnedSoFar = currentCgpa * completedSem;
      const req = (neededTotal - earnedSoFar) / remainingSem;
      requiredAverageCpi = Number(Math.max(0, Math.min(10.0, req)).toFixed(2));
    }

    return {
      student,
      academics: {
        currentCgpa,
        currentCpi: latestAcad?.cpi || currentCgpa,
        completedSemesters: completedSem,
        totalSemesters: totalSem,
        remainingSemesters: remainingSem,
        targetCgpa: student.target_cgpa,
        requiredAverageCpi,
        semesterRecords: acadRecords || [],
      },
      skills: (studentSkills || []).map((s: any) => s.skills).filter(Boolean),
      proSkills: (tutorSkills || []).map((s: any) => s.skills).filter(Boolean),
      canUseTutorMode: (tutorSkills && tutorSkills.length > 0) || false,
    };
  }

  async updateProfile(authUserId: string, dto: UpdateProfileDto) {
    const student = await this.getStudentByAuthId(authUserId);
    const admin = this.insforgeService.getAdminClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.photoUrl !== undefined) updates.photo_url = dto.photoUrl;
    if (dto.targetCgpa !== undefined) updates.target_cgpa = dto.targetCgpa;

    const { data: updated, error } = await admin.database
      .from('students')
      .update(updates)
      .eq('id', student.id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }

    return updated;
  }

  async updateTarget(authUserId: string, dto: UpdateTargetDto) {
    const student = await this.getStudentByAuthId(authUserId);
    const admin = this.insforgeService.getAdminClient();

    const { data: updated, error } = await admin.database
      .from('students')
      .update({
        target_cgpa: dto.targetCgpa,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update target CGPA: ${error.message}`);
    }

    return this.getDetailedProfile(authUserId);
  }

  async getAcademics(authUserId: string) {
    const student = await this.getStudentByAuthId(authUserId);
    const admin = this.insforgeService.getAdminClient();

    const { data: records, error } = await admin.database
      .from('academic_records')
      .select('*')
      .eq('roll_number', student.roll_number)
      .order('semester', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to retrieve academic records: ${error.message}`);
    }

    return records || [];
  }
}
