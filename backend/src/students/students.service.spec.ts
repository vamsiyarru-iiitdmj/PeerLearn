import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { StudentsService } from './students.service';

describe('StudentsService - Target CGPA Calculation', () => {
  let service: StudentsService;
  let mockInsforgeService: any;

  beforeEach(() => {
    mockInsforgeService = {
      getAdminClient: jest.fn<any>(),
    };
    service = new StudentsService(mockInsforgeService);
  });

  it('correctly calculates required average CPI for remaining semesters', async () => {
    const student = {
      id: 'student-uuid',
      roll_number: '2022CSE001',
      programme: 'B.Tech',
      target_cgpa: 8.5,
    };

    const mockAdmin: any = {
      database: {
        from: jest.fn<any>().mockImplementation((table: string) => {
          if (table === 'students') {
            return {
              select: jest.fn<any>().mockReturnThis(),
              eq: jest.fn<any>().mockReturnThis(),
              limit: jest.fn<any>().mockResolvedValue({ data: [student], error: null }),
            };
          }
          if (table === 'academic_records') {
            return {
              select: jest.fn<any>().mockReturnThis(),
              eq: jest.fn<any>().mockReturnThis(),
              order: jest.fn<any>().mockResolvedValue({
                data: [
                  { semester: 1, cpi: 7.8, cgpa: 7.8 },
                  { semester: 2, cpi: 8.0, cgpa: 7.9 },
                  { semester: 3, cpi: 8.1, cgpa: 8.0 },
                  { semester: 4, cpi: 8.0, cgpa: 8.0 },
                ],
                error: null,
              }),
            };
          }
          return {
            select: jest.fn<any>().mockReturnThis(),
            eq: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
          };
        }),
      },
    };

    mockInsforgeService.getAdminClient.mockReturnValue(mockAdmin);

    const result = await service.getDetailedProfile('auth-user-id');
    expect(result.academics.currentCgpa).toBe(8.0);
    expect(result.academics.completedSemesters).toBe(4);
    expect(result.academics.remainingSemesters).toBe(4);
    expect(result.academics.targetCgpa).toBe(8.5);
    expect(result.academics.requiredAverageCpi).toBe(9.0);
  });
});
