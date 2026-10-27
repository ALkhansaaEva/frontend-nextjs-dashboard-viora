import apiClient from './api.client';
import type { PaginatedResponse, ListParams } from '@/types';

export interface Room {
  id: string;
  roomCode: string;
  publicRoomId?: string | null;
  ownerId?: string;
  owner?: {
    id: string;
    profile?: {
      username?: string;
      nickname?: string;
      avatarUrl?: string | null;
    };
  };
  name: Record<string, string>;
  /** Verbatim RoomStatus (common/enums/room-status.enum.ts) — no `suspended`. */
  status?: 'active' | 'inactive' | 'locked' | 'closed';
  level: number;
  xp?: number;
  capacity?: number;
  country?: string | null;
  slogan?: string | null;
  createdAt?: string;
  updatedAt: string;
  /**
   * Never aggregated by any live rooms endpoint (RoomAdminOperationsService.list
   * / .details select the entity only) — absent means "not reported", so the UI
   * renders "—", never a fabricated count.
   */
  memberCount?: number;
  backgroundId?: string | null;
  themeId?: string | null;
  profileImageUrl?: string | null;
  members?: RoomMember[];
}

export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'owner' | 'moderator' | 'member' | 'speaker';
  isMuted: boolean;
  joinedAt: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

/**
 * Ban/mute/kick rows come from raw `SELECT rb.*`-style queries in
 * rooms.service.ts, so they keep SQL column names — `created_at`, `untilAt`,
 * `actorUserId` — and are NOT camelCased like the TypeORM entity responses.
 */
interface RoomBan {
  id: string;
  roomId: string;
  userId: string;
  actorUserId: string;
  /** Joined by the backend list query for human-readable moderation rows. */
  username?: string | null;
  immutableUserId?: string | null;
  banType: string;
  untilAt?: string | null;
  reason?: string | null;
  created_at: string;
}

interface RoomMute {
  id: string;
  roomId: string;
  userId: string;
  actorUserId: string;
  username?: string | null;
  immutableUserId?: string | null;
  muteType: 'chat' | 'mic' | 'all';
  untilAt?: string | null;
  reason?: string | null;
  created_at: string;
}

interface RoomKick {
  id: string;
  roomId: string;
  userId: string;
  actorUserId: string;
  username?: string | null;
  immutableUserId?: string | null;
  untilAt?: string | null;
  reason?: string | null;
  created_at: string;
}

interface RawPaginatedResponse<T> {
  data?: T[];
  rooms?: T[];
  total?: number;
  page?: number;
  offset?: number;
  limit?: number;
  totalPages?: number;
}

export function normalizePaginatedResponse<T>(response: unknown): PaginatedResponse<T> {
  const raw = response as RawPaginatedResponse<T>;
  const data = raw.data || raw.rooms || [];
  const limit = raw.limit || data.length || 20;
  const total = raw.total ?? data.length;
  const page = raw.page || (raw.offset != null ? Math.floor(raw.offset / limit) + 1 : 1);
  return {
    data,
    total,
    page,
    limit,
    totalPages: raw.totalPages || Math.max(1, Math.ceil(total / limit)),
  };
}

function mapRoomMember(member: Record<string, unknown>): RoomMember {
  const user =
    member.user && typeof member.user === 'object' ? (member.user as Record<string, unknown>) : {};
  const profile =
    user.profile && typeof user.profile === 'object'
      ? (user.profile as Record<string, unknown>)
      : {};
  const rawRole = member.role;
  const role: RoomMember['role'] =
    rawRole === 'owner' || rawRole === 'moderator' || rawRole === 'speaker' ? rawRole : 'member';

  return {
    id: String(member.id ?? ''),
    roomId: String(member.roomId ?? ''),
    userId: String(member.userId ?? user.id ?? ''),
    role,
    isMuted: Boolean(member.isMuted),
    joinedAt: String(member.joinedAt ?? ''),
    user: {
      id: String(user.id ?? member.userId ?? ''),
      nickname: String(profile.nickname ?? profile.username ?? user.nickname ?? 'Unknown User'),
      avatar: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined,
    },
  };
}

/** A pending "waiting list" entry for Room PK. `userId` is the player's
 *  immutableUserId (public ID), matching the roster payloads. */
export interface RoomRoundJoinRequestDto {
  id: string;
  userId: string;
  state: string;
}

/** Public round projection from RoomRoundPublicProjectionService. */
export interface RoomRoundDto {
  id: string;
  state: string;
  teamSize: number;
  durationMode?: string;
  requestedByUserId?: string | null;
  targetUserId?: string | null;
  participants: Array<{
    userId: string;
    sideIndex: number;
    state: string;
    score: number;
  }>;
  winnerUserIds?: string[];
  completionReason?: string | null;
}

export const roomsService = {
  async getRooms(params?: ListParams): Promise<PaginatedResponse<Room>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    const url = query ? `/rooms?${query}` : '/rooms';

    const response = await apiClient.get<RawPaginatedResponse<Room>>(url);
    return normalizePaginatedResponse(response);
  },

  async getRoomById(roomId: string): Promise<Room> {
    return apiClient.get<Room>(`/rooms/${roomId}`);
  },

  async joinRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/join`);
  },

  async leaveRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/leave`);
  },

  async getRoomMembers(roomId: string): Promise<RoomMember[]> {
    const response = await apiClient.get<RoomMember[] | { data: RoomMember[] }>(
      `/rooms/${roomId}/members`,
    );
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMember[] }).data || [];
  },

  async kickUser(
    roomId: string,
    userId: string,
    data: { durationType: '2h' | '12m'; reason?: string },
  ): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/kick/${userId}`, data);
  },

  async banUser(roomId: string, userId: string, reason?: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/ban/${userId}`, { reason });
  },

  async unbanUser(roomId: string, userId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/unban/${userId}`);
  },

  async muteUser(
    roomId: string,
    userId: string,
    data: {
      muteType: 'chat' | 'mic' | 'all';
      durationMinutes?: number;
      reason?: string;
    },
  ): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/mute/${userId}`, data);
  },

  async unmuteUser(
    roomId: string,
    userId: string,
    muteType?: 'chat' | 'mic' | 'all',
  ): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/unmute/${userId}`, { muteType });
  },

  async getBans(roomId: string): Promise<RoomBan[]> {
    const response = await apiClient.get<RoomBan[] | { data: RoomBan[] }>(`/rooms/${roomId}/bans`);
    if (Array.isArray(response)) return response;
    return (response as { data: RoomBan[] }).data || [];
  },

  async getMutes(roomId: string): Promise<RoomMute[]> {
    const response = await apiClient.get<RoomMute[] | { data: RoomMute[] }>(
      `/rooms/${roomId}/mutes`,
    );
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMute[] }).data || [];
  },

  async getModerators(roomId: string): Promise<RoomMember[]> {
    const response = await apiClient.get<RoomMember[] | { data: RoomMember[] }>(
      `/rooms/${roomId}/moderators`,
    );
    if (Array.isArray(response)) return response;
    return (response as { data: RoomMember[] }).data || [];
  },

  async getKicks(roomId: string): Promise<RoomKick[]> {
    const response = await apiClient.get<RoomKick[] | { data: RoomKick[] }>(
      `/rooms/${roomId}/kicks`,
    );
    if (Array.isArray(response)) return response;
    return (response as { data: RoomKick[] }).data || [];
  },

  async getAdminRooms(params?: ListParams): Promise<PaginatedResponse<Room>> {
    const searchParams = new URLSearchParams();
    if (params?.page)
      searchParams.set('offset', ((params.page - 1) * (params.limit || 20)).toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/rooms/admin/rooms?${query}` : '/rooms/admin/rooms';
    const response = await apiClient.get<RawPaginatedResponse<Room>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminRoomById(roomId: string): Promise<Room> {
    const response = await apiClient.get<{
      room: Room;
      members?: Array<Record<string, unknown>>;
    }>(`/rooms/admin/rooms/${roomId}`);
    return {
      ...response.room,
      members: (response.members ?? []).map(mapRoomMember),
    };
  },

  /** PATCH /rooms/admin/rooms/:id — verbatim UpdateRoomDto (rooms/dto/update-room.dto.ts).
   * `level` is NOT an accepted field; the global whitelist ValidationPipe strips it. */
  async updateAdminRoom(
    roomId: string,
    data: {
      name?: Record<string, string>;
      slogan?: string;
      capacity?: number;
      country?: string;
      backgroundId?: string;
      themeId?: string;
      /** Empty string clears it (backend `@Matches(/^$|^https?:\/\/\S+$/)`). */
      profileImageUrl?: string;
    },
  ): Promise<Room> {
    return apiClient.patch<Room>(`/rooms/admin/rooms/${roomId}`, data);
  },

  async deleteAdminRoom(roomId: string): Promise<void> {
    await apiClient.delete(`/rooms/admin/rooms/${roomId}`);
  },

  async closeAdminRoom(roomId: string): Promise<void> {
    await apiClient.post(`/rooms/admin/rooms/${roomId}/close`);
  },

  async getMyRooms(): Promise<Room[]> {
    const response = await apiClient.get<Room[] | { data: Room[] }>('/rooms/me');
    if (Array.isArray(response)) return response;
    return (response as { data: Room[] }).data || [];
  },

  async assignRoomRole(
    roomId: string,
    targetUserId: string,
    role: 'moderator' | 'member' | 'speaker',
  ): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/assign-role/${targetUserId}`, {
      role,
    });
  },

  async removeRoomRole(roomId: string, targetUserId: string): Promise<void> {
    await apiClient.post(`/rooms/${roomId}/remove-role/${targetUserId}`);
  },

  /** Pending "waiting list" entries (immutableUserId players) for Room PK. */
  async getRoomRoundJoinRequestsAdmin(roomId: string): Promise<RoomRoundJoinRequestDto[]> {
    const response = await apiClient.get<
      RoomRoundJoinRequestDto[] | { data?: RoomRoundJoinRequestDto[] }
    >(`/rooms/admin/rooms/${roomId}/rounds/join-requests`);
    return Array.isArray(response) ? response : (response.data ?? []);
  },

  /**
   * POST /rooms/admin/rooms/:roomId/rounds — strict explicit roster.
   * `teammateUserIds` is the FULL red side (side A); the blue side is
   * `opponentUserIds` (team) or `targetUserId` (1v1). Every listed player
   * must hold a pending join request at request time. The acting staff user
   * is never implicitly rostered.
   */
  async createRoomRoundAdmin(
    roomId: string,
    data: {
      teammateUserIds?: string[];
      opponentUserIds?: string[];
      targetUserId?: string;
      durationMode: 'SHORT_60' | 'LONG_180';
      idempotencyKey: string;
    },
  ): Promise<RoomRoundDto> {
    return apiClient.post<RoomRoundDto>(`/rooms/admin/rooms/${roomId}/rounds`, data);
  },

  /** Pre-start cancellation only; active rounds are participant-forfeited. */
  async cancelRoomRoundAdmin(roomId: string, roundId: string): Promise<RoomRoundDto> {
    return apiClient.post<RoomRoundDto>(
      `/rooms/admin/rooms/${roomId}/rounds/${roundId}/cancel`,
      {},
    );
  },
};

export default roomsService;
