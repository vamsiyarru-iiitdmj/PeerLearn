import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { SessionsService } from './sessions.service';
import { ConflictException } from '@nestjs/common';
import { SessionMode } from './dto/book-session.dto';

describe('SessionsService - Atomic Booking Race Conflict', () => {
  let service: SessionsService;
  let mockInsforgeService: any;

  beforeEach(() => {
    mockInsforgeService = {
      getAdminClient: jest.fn<any>(),
    };
    service = new SessionsService(mockInsforgeService);
  });

  it('throws HTTP 409 Conflict when doubt was already booked by a competing tutor', async () => {
    const mockAdmin: any = {
      database: {
        rpc: jest.fn<any>().mockResolvedValue({
          data: {
            success: false,
            message: 'Doubt is no longer available or already booked.',
          },
          error: null,
        }),
      },
    };

    mockInsforgeService.getAdminClient.mockReturnValue(mockAdmin);

    await expect(
      service.bookDoubt('doubt-id', 'competing-tutor-id', {
        scheduledStart: '2026-10-22T10:00:00.000Z',
        scheduledEnd: '2026-10-22T11:00:00.000Z',
        mode: SessionMode.ONLINE,
        meetingUrl: 'https://meet.google.com/test',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
