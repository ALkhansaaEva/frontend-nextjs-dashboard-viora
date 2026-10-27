import apiClient from './api.client';

export interface SystemRank {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  badgeItemId?: string;
  badgeIconUrl?: string;
  priority: number;
  createdAt?: string;
}

export interface RoomRank {
  id: string;
  roomId: string;
  code: string;
  titleI18n: Record<string, string>;
  priority: number;
}

export interface SystemRankAssignment {
  id: string;
  userId: string;
  rankId: string;
  rank: SystemRank;
  note?: string;
  assignedAt: string;
  assignedByUserId?: string;
}

export interface RoomRankAssignment {
  id: string;
  roomId: string;
  userId: string;
  roomRankId: string;
  roomRank: RoomRank;
  note?: string;
  assignedAt: string;
  assignedByUserId?: string;
  expiresAt?: string;
}

export interface RoomRankTemplate {
  code: string;
  titleI18n: Record<string, string>;
  priority: number;
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

  async updateSystemRank(id: string, data: {
    titleI18n: Record<string, string>;
    descriptionI18n: Record<string, string>;
    badgeItemId?: string;
    badgeIconUrl?: string;
    priority: number;
  }): Promise<SystemRank> {
    return apiClient.put<SystemRank>(`/ranks/system/${id}`, data);
  },

  async assignSystemRank(userId: string, rankId: string, note?: string): Promise<void> {
    await apiClient.post('/ranks/system/assign', { userId, rankId, note });
  },

  async revokeSystemRank(userId: string, rankId: string): Promise<void> {
    await apiClient.post(`/ranks/system/revoke/${userId}/${rankId}`);
  },

  async getUserSystemRanks(userId: string): Promise<SystemRankAssignment[]> {
    const response = await apiClient.get<SystemRankAssignment[] | { data: SystemRankAssignment[] }>(`/ranks/system/user/${userId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: SystemRankAssignment[] }).data || [];
  },

  async getMySystemRanks(): Promise<SystemRankAssignment[]> {
    const response = await apiClient.get<SystemRankAssignment[] | { data: SystemRankAssignment[] }>('/ranks/system/me');
    if (Array.isArray(response)) return response;
    return (response as { data: SystemRankAssignment[] }).data || [];
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

  async getUserRoomRanks(roomId: string, userId: string): Promise<RoomRankAssignment[]> {
    const response = await apiClient.get<RoomRankAssignment[] | { data: RoomRankAssignment[] }>(`/ranks/room/${roomId}/user/${userId}`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomRankAssignment[] }).data || [];
  },

  async getRoomRanksList(): Promise<RoomRankTemplate[]> {
    const response = await apiClient.get<unknown>('/ranks/rooms');
    if (Array.isArray(response)) return response as RoomRankTemplate[];
    const r = response as { data?: RoomRankTemplate[] };
    return r.data || [];
  },

  async getMyRoomRanks(roomId: string): Promise<RoomRankAssignment[]> {
    return apiClient.get<RoomRankAssignment[]>(`/ranks/room/${roomId}/me`);
  },

  async revokeSystemRankByPath(userId: string, rankId: string): Promise<void> {
    await apiClient.post(`/ranks/system/revoke/${userId}/${rankId}`);
  },
};

export default ranksService;
