'use client';

import { useQuery } from '@tanstack/react-query';
import { metaGameService } from '@/services';
import type { LeaderboardEntry, UserRank } from '@/services/meta-game.service';

export const useLeaderboard = (gameType: string) => {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ['leaderboard', gameType],
    queryFn: () => metaGameService.getLeaderboard(gameType),
    enabled: !!gameType,
    staleTime: 30000,
  });
};

export const useUserRank = (gameType: string, userId: string) => {
  return useQuery<UserRank>({
    queryKey: ['user-rank', gameType, userId],
    queryFn: () => metaGameService.getUserRank(gameType, userId),
    enabled: !!gameType && !!userId,
    staleTime: 30000,
  });
};
