import apiClient from './api.client';
import type { PaginatedResponse, ListParams } from '@/types';

interface Room {
  id: string;
  roomCode: string;
  name: Record<string, string>;
  level: number;
  updatedAt: string;
  memberCount?: number;
}

interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'user';
  isMuted: boolean;
  joinedAt: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface RoomBan {
  id: string;
  roomId: string;
  userId: string;
  reason?: string;
  createdAt: string;
  expiresAt?: string;
}

interface RoomMute {
  id: string;
  roomId: string;
  userId: string;
  reason?: string;
  createdAt: string;
  expiresAt: string;
}

interface RoomKick {
  id: string;
  roomId: string;
  userId: string;
  reason?: string;
  kickedBy: string;
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

export const roomsService = {
  async getRooms(params?: ListParams): Promise<PaginatedResponse<Room>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('sortBy', params.search);

    const query = searchParams.toString();
    const url = query ? `/rooms?${query}` : '/rooms';

    const response = await apiClient.get<RawPaginatedResponse<Room>>(url);
    return normalizePaginatedResponse(response);
  },

  async getRoomById(roomId: string): Promise<Room> {
    return apiClient.get<Room>(`/rooms/${roomId}`);
  },

  async createRoom(data: { name: Record<string, string> }): Promise<Room> {
    return apiClient.post<Room>('/rooms', data);
  },

  async joinRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/join`);
  },

  async leaveRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/leave`);
  },

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const response = await apiClient.get<RoomMember[] | { data: RoomMember[] }>(`/rooms/${roomId}/members`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMember[] }).data || [];
  },

  async getRoomChat(roomId: string): Promise<RoomMessage[]> {
    const response = await apiClient.get<RoomMessage[] | { data: RoomMessage[] }>(`/rooms/${roomId}/chat`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMessage[] }).data || [];
  },

  async kickUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/kick/${userId}`);
  },

  async banUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/ban/${userId}`);
  },

  async unbanUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/unban/${userId}`);
  },

  async muteUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/mute/${userId}`);
  },

  async unmuteUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/unmute/${userId}`);
  },

  async closeRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/close`);
  },

  async reopenRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/reopen`);
  },

  async getBans(roomId: string): Promise<RoomBan[]> {
    const response = await apiClient.get<RoomBan[] | { data: RoomBan[] }>(`/rooms/${roomId}/bans`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomBan[] }).data || [];
  },

  async getMutes(roomId: string): Promise<RoomMute[]> {
    const response = await apiClient.get<RoomMute[] | { data: RoomMute[] }>(`/rooms/${roomId}/mutes`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMute[] }).data || [];
  },

  async getModerators(roomId: string): Promise<RoomMember[]> {
    const response = await apiClient.get<RoomMember[] | { data: RoomMember[] }>(`/rooms/${roomId}/moderators`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMember[] }).data || [];
  },

  async getKicks(roomId: string): Promise<RoomKick[]> {
    const response = await apiClient.get<RoomKick[] | { data: RoomKick[] }>(`/rooms/${roomId}/kicks`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomKick[] }).data || [];
  },

  async deleteMessage(roomId: string, messageId: string): Promise<void> {
    await apiClient.delete(`/rooms/${roomId}/chat/${messageId}`);
  },

  async removePin(roomId: string, pinId: string): Promise<void> {
    await apiClient.delete(`/rooms/${roomId}/pins/${pinId}`);
  },

  async getAdminRooms(params?: ListParams): Promise<PaginatedResponse<Room>> {
    const searchParams = new URLSearchParams();
    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/rooms/admin/rooms?${query}` : '/rooms/admin/rooms';
    const response = await apiClient.get<RawPaginatedResponse<Room>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminRoomById(roomId: string): Promise<Room> {
    return apiClient.get<Room>(`/rooms/admin/rooms/${roomId}`);
  },

  async updateAdminRoom(roomId: string, data: { name?: Record<string, string>; level?: number }): Promise<Room> {
    return apiClient.patch<Room>(`/rooms/admin/rooms/${roomId}`, data);
  },

  async deleteAdminRoom(roomId: string): Promise<void> {
    await apiClient.delete(`/rooms/admin/rooms/${roomId}`);
  },

  async getAdminRoomChat(roomId: string): Promise<RoomMessage[]> {
    const response = await apiClient.get<RoomMessage[] | { data: RoomMessage[] }>(`/rooms/admin/rooms/${roomId}/chat`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMessage[] }).data || [];
  },

  async closeAdminRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/admin/rooms/${roomId}/close`);
  },

  async getRoomStats(): Promise<{ totalRooms: number; activeRooms: number; totalMembers: number }> {
    return apiClient.get('/rooms/admin/rooms/stats');
  },
};

export default roomsService;