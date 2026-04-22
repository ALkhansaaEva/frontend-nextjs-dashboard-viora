'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metaGameService } from '@/services';

interface DailyLoginStatus {
  streak: number;
  lastClaimedAt?: string;
  canClaim: boolean;
  reward?: {
    currency: 'gold' | 'gems';
    amount: number;
  };
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  progress: number;
  target: number;
  reward: {
    currency: 'gold' | 'gems';
    amount: number;
  };
  isCompleted: boolean;
  isClaimed: boolean;
  expiresAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

interface UserRank {
  rank: number;
  score: number;
  totalPlayers: number;
}

export const useDailyLogin = () => {
  return useQuery<DailyLoginStatus>({
    queryKey: ['daily-login'],
    queryFn: () => metaGameService.getDailyLogin(),
    staleTime: 30000,
  });
};

export const useClaimDailyLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => metaGameService.claimDailyLogin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-login'] });
    },
  });
};

export const useTasks = () => {
  return useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => metaGameService.getTasks(),
    staleTime: 30000,
  });
};

export const useClaimTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => metaGameService.claimTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-login'] });
    },
  });
};

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