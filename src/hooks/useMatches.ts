'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesService } from '@/services';
import type { PaginatedResponse, ListParams } from '@/types';

interface Match {
  id: string;
  gameType: string;
  status: 'waiting' | 'playing' | 'finished';
  players: MatchPlayer[];
  winnerId?: string;
  roomCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface MatchPlayer {
  userId: string;
  position: number;
  score?: number;
  isFinished: boolean;
  finishedAt?: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

interface MatchMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface MatchInvite {
  id: string;
  matchId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export const useMatches = (params?: ListParams & { gameType?: string; detailed?: boolean }) => {
  return useQuery<PaginatedResponse<Match>>({
    queryKey: ['matches', params],
    queryFn: () => matchesService.getHistory(params),
    staleTime: 30000,
  });
};

export const useMatch = (matchId: string) => {
  return useQuery<Match>({
    queryKey: ['match', matchId],
    queryFn: () => matchesService.getMatchById(matchId),
    enabled: !!matchId,
    staleTime: 30000,
  });
};

export const useMatchChat = (matchId: string, limit = 50) => {
  return useQuery<MatchMessage[]>({
    queryKey: ['match-chat', matchId, limit],
    queryFn: () => matchesService.getMatchChat(matchId, limit),
    enabled: !!matchId,
    staleTime: 10000,
  });
};

export const useCreatePrivateMatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => matchesService.createPrivateMatch(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useJoinMatchByCode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomCode: string) => matchesService.joinByCode(roomCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useMatchInvites = () => {
  return useQuery<MatchInvite[]>({
    queryKey: ['match-invites'],
    queryFn: () => matchesService.getMyInvites(),
    staleTime: 30000,
  });
};

export const useAcceptMatchInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => matchesService.acceptInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-invites'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useDeclineMatchInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => matchesService.declineInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-invites'] });
    },
  });
};