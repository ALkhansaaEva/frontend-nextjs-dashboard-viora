import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from './api.client';
import { metaGameService } from './meta-game.service';

vi.mock('./api.client', () => ({
  default: { get: vi.fn() },
}));

describe('metaGameService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the backend leaderboard contract to ranked rows', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      leaderboard: [
        {
          userId: 'user-1',
          gameType: 'ludo',
          currentRating: 1420,
          highestRating: 1500,
          seasonHighestRating: 1450,
          seasonId: null,
          wins: 8,
          losses: 3,
          draws: 1,
          forfeits: 0,
          streak: 2,
          totalGames: 12,
          winRate: 8 / 11,
          tier: 'SILVER',
          updatedAt: '2026-08-24T00:00:00.000Z',
        },
      ],
      total: 1,
    });

    const result = await metaGameService.getLeaderboard('ludo');

    expect(result).toEqual([
      expect.objectContaining({
        rank: 1,
        userId: 'user-1',
        currentRating: 1420,
        tier: 'SILVER',
      }),
    ]);
  });
});
