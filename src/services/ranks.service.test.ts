import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from './api.client';
import { ranksService } from './ranks.service';

vi.mock('./api.client', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

describe('ranksService assignment contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns system-rank assignments with their nested rank', async () => {
    const assignment = {
      id: 'assignment-1',
      userId: 'user-1',
      rankId: 'rank-1',
      assignedAt: '2026-08-24T00:00:00.000Z',
      rank: {
        id: 'rank-1',
        code: 'SILVER',
        titleI18n: { en: 'Silver' },
        descriptionI18n: {},
        priority: 2,
      },
    };
    vi.mocked(apiClient.get).mockResolvedValue([assignment]);

    await expect(ranksService.getMySystemRanks()).resolves.toEqual([
      assignment,
    ]);
  });

  it('does not convert room-rank API errors into a false empty success', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Forbidden'));

    await expect(ranksService.getMyRoomRanks('room-1')).rejects.toThrow(
      'Forbidden',
    );
  });
});
