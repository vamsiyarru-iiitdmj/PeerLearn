import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService - Privacy Suppression Rule', () => {
  let service: AnalyticsService;
  let mockInsforgeService: any;

  beforeEach(() => {
    mockInsforgeService = {
      getAdminClient: jest.fn<any>(),
    };
    service = new AnalyticsService(mockInsforgeService);
  });

  it('suppresses cohort metrics when group size is under 10 students', async () => {
    // 5 students in 3rd year (< 10 privacy threshold)
    const mockDoubts = [
      { id: '1', students: { year_of_study: 3 } },
      { id: '2', students: { year_of_study: 3 } },
      { id: '3', students: { year_of_study: 3 } },
      { id: '4', students: { year_of_study: 3 } },
      { id: '5', students: { year_of_study: 3 } },
    ];

    const mockAdmin: any = {
      database: {
        from: jest.fn<any>().mockReturnValue({
          select: jest.fn<any>().mockResolvedValue({ data: mockDoubts, error: null }),
        }),
      },
    };

    mockInsforgeService.getAdminClient.mockReturnValue(mockAdmin);

    const result = await service.getDoubtsByYear();
    const thirdYearStats = result.find((r) => r.year === 3);

    expect(thirdYearStats).toBeDefined();
    expect(thirdYearStats?.isSuppressedForPrivacy).toBe(true);
    expect(thirdYearStats?.count).toBeNull();
    expect(thirdYearStats?.message).toContain('suppressed to maintain student privacy');
  });
});
