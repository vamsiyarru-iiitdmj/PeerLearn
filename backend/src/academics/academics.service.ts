import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InsforgeService } from '../insforge/insforge.service';

@Injectable()
export class AcademicsService {
  constructor(private insforgeService: InsforgeService) {}

  async verifyRollNumber(rollNumber: string) {
    const cleanRoll = rollNumber.trim().toUpperCase();
    const admin = this.insforgeService.getAdminClient();

    // Check if student already registered
    const { data: existingStudent } = await admin.database
      .from('students')
      .select('id, roll_number')
      .eq('roll_number', cleanRoll)
      .limit(1);

    if (existingStudent && existingStudent.length > 0) {
      return {
        isEligible: false,
        message: 'A student account is already registered with this roll number.',
      };
    }

    // Check in authoritative academic records
    const { data: record, error } = await admin.database
      .from('academic_records')
      .select('roll_number, full_name, department, programme, year_of_study')
      .eq('roll_number', cleanRoll)
      .limit(1);

    if (error || !record || record.length === 0) {
      return {
        isEligible: false,
        message: `Roll number ${cleanRoll} not found in authoritative academic records. Please contact the academic office.`,
      };
    }

    return {
      isEligible: true,
      rollNumber: cleanRoll,
      record: record[0],
    };
  }

  async importAcademicRecords(records: any[], filename = 'import.csv') {
    if (!Array.isArray(records) || records.length === 0) {
      throw new BadRequestException('Import payload must contain at least one valid record row');
    }

    const admin = this.insforgeService.getAdminClient();

    // Validate rows
    const validRows = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r.roll_number || !r.full_name) {
        errors.push(`Row ${i + 1}: Missing required roll_number or full_name`);
        continue;
      }

      validRows.push({
        roll_number: String(r.roll_number).trim().toUpperCase(),
        full_name: String(r.full_name).trim(),
        programme: r.programme || 'B.Tech',
        department: r.department || 'CSE',
        year_of_study: Number(r.year_of_study) || 2,
        batch: String(r.batch || '2022'),
        semester: Number(r.semester) || 1,
        cpi: Number(r.cpi) || 8.0,
        cgpa: Number(r.cgpa) || 8.0,
      });
    }

    if (validRows.length === 0) {
      throw new BadRequestException(`Import failed with errors: ${errors.join('; ')}`);
    }

    // Create import record
    const { data: importLog } = await admin.database
      .from('academic_imports')
      .insert([
        {
          filename,
          record_count: validRows.length,
          status: errors.length > 0 ? 'PARTIAL' : 'COMPLETED',
          error_summary: errors.length > 0 ? errors.join('\n') : null,
        },
      ])
      .select()
      .single();

    // Upsert records
    for (const row of validRows) {
      await admin.database
        .from('academic_records')
        .upsert(row, { onConflict: 'roll_number,semester' });
    }

    return {
      message: `Successfully processed ${validRows.length} academic records`,
      importId: importLog?.id,
      errorsCount: errors.length,
      errors,
    };
  }
}
