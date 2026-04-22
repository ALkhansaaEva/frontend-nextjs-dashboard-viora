import apiClient from './api.client';
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

interface RawPaginatedResponse<T> {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function normalizePaginatedResponse<T>(response: unknown): PaginatedResponse<T> {
  const raw = response as RawPaginatedResponse<T>;
  const data = raw.data || [];
  return {
    data,
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
  };
}

export const matchesService = {
  async getHistory(params?: ListParams & { gameType?: string; detailed?: boolean }): Promise<PaginatedResponse<Match>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('gameType', params.search);
    if (params?.detailed !== undefined) searchParams.set('detailed', params.detailed.toString());

    const query = searchParams.toString();
    const url = query ? `/matches/history?${query}` : '/matches/history';

    const response = await apiClient.get<RawPaginatedResponse<Match>>(url);
    return normalizePaginatedResponse(response);
  },

  async getMatchById(matchId: string): Promise<Match> {
    return apiClient.get<Match>(`/matches/history/${matchId}`);
  },

  async getMatchChat(matchId: string, limit = 50): Promise<MatchMessage[]> {
    const response = await apiClient.get<MatchMessage[] | { data: MatchMessage[] }>(`/matches/${matchId}/chat?limit=${limit}`);
    if (Array.isArray(response)) return response;
    return (response as { data: MatchMessage[] }).data || [];
  },

  async createPrivateMatch(): Promise<Match> {
    return apiClient.post<Match>('/matches/create');
  },

  async joinByCode(roomCode: string): Promise<Match> {
    return apiClient.post<Match>('/matches/join-by-code', { roomCode });
  },

  async sendInvite(matchId: string, userId: string): Promise<void> {
    await apiClient.post(`/matches/${matchId}/invite`, { userId });
  },

  async acceptInvite(inviteId: string): Promise<Match> {
    return apiClient.post<Match>(`/matches/invite/${inviteId}/accept`);
  },

  async declineInvite(inviteId: string): Promise<void> {
    await apiClient.post(`/matches/invite/${inviteId}/decline`);
  },

  async getMyInvites(): Promise<MatchInvite[]> {
    const response = await apiClient.get<MatchInvite[] | { data: MatchInvite[] }>('/matches/invites/me');
    if (Array.isArray(response)) return response;
    return (response as { data: MatchInvite[] }).data || [];
  },
};

export default matchesService;