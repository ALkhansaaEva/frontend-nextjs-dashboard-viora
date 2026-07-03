import apiClient from './api.client';

interface SystemRank {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  badgeItemId?: string;
  badgeIconUrl?: string;
  priority: number;
  createdAt?: string;
}

interface RoomRank {
  id: string;
  roomId: string;
  code: string;
  titleI18n: Record<string, string>;
  priority: number;
}

interface RankAssignment {
  id: string;
  userId: string;
  rankId: string;
  note?: string;
  assignedAt: string;
  assignedBy?: string;
  user?: {
    id: string;
    nickname: string;
  };
}

export const ranksService = {
  async getSystemRanks(): Promise<SystemRank[]> {
    const response = await apiClient.get<SystemRank[] | { data: SystemRank[] }>('/ranks/system');
    if (Array.isArray(response)) return response;
    return (response as { data: SystemRank[] }).data || [];
  },

  async createSystemRank(data: {
    code: string;
    titleI18n: Record<string, string>;
    descriptionI18n: Record<string, string>;
    badgeItemId?: string;
    badgeIconUrl?: string;
    priority: number;
  }): Promise<SystemRank> {
    return apiClient.post<SystemRank>('/ranks/system', data);
  },

  async assignSystemRank(userId: string, rankId: string, note?: string): Promise<void> {
    await apiClient.post('/ranks/system/assign', { userId, rankId, note });
  },

  async revokeSystemRank(userId: string, rankId: string): Promise<void> {
    await apiClient.post(`/ranks/system/revoke/${userId}/${rankId}`);
  },

  async getUserSystemRanks(userId: string): Promise<RankAssignment[]> {
    const response = await apiClient.get<RankAssignment[] | { data: RankAssignment[] }>(`/ranks/system/user/${userId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: RankAssignment[] }).data || [];
  },

  async getMySystemRanks(): Promise<SystemRank[]> {
    const response = await apiClient.get<SystemRank[] | { data: SystemRank[] }>('/ranks/system/me');
    if (Array.isArray(response)) return response;
    return (response as { data: SystemRank[] }).data || [];
  },

  async getRoomRanks(roomId: string): Promise<RoomRank[]> {
    const response = await apiClient.get<RoomRank[] | { data: RoomRank[] }>(`/ranks/room/${roomId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomRank[] }).data || [];
  },

  async createRoomRank(data: {
    roomId: string;
    code: string;
    titleI18n: Record<string, string>;
    priority: number;
  }): Promise<RoomRank> {
    return apiClient.post<RoomRank>('/ranks/room', data);
  },

  async assignRoomRank(roomId: string, userId: string, roomRankId: string, note?: string): Promise<void> {
    await apiClient.post('/ranks/room/assign', { roomId, userId, roomRankId, note });
  },

  async revokeRoomRank(roomId: string, userId: string, roomRankId: string): Promise<void> {
    await apiClient.post(`/ranks/room/revoke/${roomId}/${userId}/${roomRankId}`);
  },

  async getUserRoomRanks(roomId: string, userId: string): Promise<RoomRank[]> {
    const response = await apiClient.get<RoomRank[] | { data: RoomRank[] }>(`/ranks/room/${roomId}/user/${userId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomRank[] }).data || [];
  },

  async getRoomRanksList(): Promise<{ id: string; code: string; titleI18n: Record<string, string> }[]> {
    const response = await apiClient.get<unknown>('/ranks/rooms');
    if (Array.isArray(response)) return response as { id: string; code: string; titleI18n: Record<string, string> }[];
    const r = response as { data?: { id: string; code: string; titleI18n: Record<string, string> }[] };
    return r.data || [];
  },

  async getMyRoomRank(roomId: string): Promise<RoomRank | null> {
    try {
      return await apiClient.get<RoomRank>(`/ranks/room/${roomId}/me`);
    } catch {
      return null;
    }
  },

  async revokeSystemRankByPath(userId: string, rankId: string): Promise<void> {
    await apiClient.post(`/ranks/system/revoke/${userId}/${rankId}`);
  },
};

export default ranksService;