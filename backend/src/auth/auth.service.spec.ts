import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { AuthService } from './auth.service';
import { BadRequestException } from '@nestjs/common';

describe('AuthService - Identity & Eligibility Verification', () => {
  let service: AuthService;
  let mockInsforgeService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockInsforgeService = {
      getAdminClient: jest.fn<any>(),
    };
    mockConfigService = {
      get: jest.fn<any>().mockImplementation((key: string, def: string) => {
        if (key === 'INSTITUTE_EMAIL_DOMAIN') return 'iiitdmj.ac.in';
        return def;
      }),
    };
    service = new AuthService(mockInsforgeService, mockConfigService);
  });

  it('rejects registration with invalid institute email domain', async () => {
    await expect(
      service.registerStart({
        rollNumber: '2022CSE001',
        fullName: 'Test Student',
        personalEmail: 'test@gmail.com',
        instituteEmail: 'student@gmail.com', // Wrong domain
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects registration when roll number does not exist in academic records', async () => {
    const mockAdmin: any = {
      database: {
        from: jest.fn<any>().mockImplementation((table: string) => {
          if (table === 'students') {
            return {
              select: jest.fn<any>().mockReturnThis(),
              or: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
            };
          }
          if (table === 'academic_records') {
            return {
              select: jest.fn<any>().mockReturnThis(),
              eq: jest.fn<any>().mockReturnThis(),
              limit: jest.fn<any>().mockResolvedValue({ data: [], error: null }),
            };
          }
          return { select: jest.fn<any>().mockReturnThis() };
        }),
      },
      auth: {
        signInWithOtp: jest.fn<any>(),
      },
    };

    mockInsforgeService.getAdminClient.mockReturnValue(mockAdmin);

    await expect(
      service.registerStart({
        rollNumber: 'INVALID_ROLL_999',
        fullName: 'Unknown Student',
        personalEmail: 'unknown@gmail.com',
        instituteEmail: 'unknown@iiitdmj.ac.in',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
