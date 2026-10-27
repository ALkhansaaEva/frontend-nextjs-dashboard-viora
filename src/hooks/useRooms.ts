import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '@/services';
import type { PaginatedResponse } from '@/types';
import type { Room } from '@/services/rooms.service';

interface RoomQuery {
  page?: number;
  limit?: number;
  search?: string;
  admin?: boolean;
}

export const useRooms = (params?: RoomQuery) => {
  return useQuery<PaginatedResponse<Room>>({
    queryKey: ['rooms', params],
    queryFn: () => params?.admin ? roomsService.getAdminRooms(params) : roomsService.getRooms(params),
    staleTime: 30000,
  });
};

export const useRoom = (roomId: string, admin?: boolean) => {
  return useQuery({
    queryKey: ['room', roomId, admin],
    queryFn: () => admin ? roomsService.getAdminRoomById(roomId) : roomsService.getRoomById(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomBans = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: ['room-bans', roomId],
    queryFn: () => roomsService.getBans(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30000,
  });
};

export const useRoomMutes = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: ['room-mutes', roomId],
    queryFn: () => roomsService.getMutes(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30000,
  });
};

export const useRoomKicks = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: ['room-kicks', roomId],
    queryFn: () => roomsService.getKicks(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30000,
  });
};

export const useKickUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId, durationType, reason }: {
      roomId: string;
      userId: string;
      durationType: '2h' | '12m';
      reason?: string;
    }) => roomsService.kickUser(roomId, userId, { durationType, reason }),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, true] });
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId, reason }: { roomId: string; userId: string; reason?: string }) =>
      roomsService.banUser(roomId, userId, reason),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, true] });
      queryClient.invalidateQueries({ queryKey: ['room-bans', roomId] });
    },
  });
};

export const useUnbanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsService.unbanUser(roomId, userId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-bans', roomId] });
    },
  });
};

export const useMuteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId, muteType, durationMinutes, reason }: {
      roomId: string;
      userId: string;
      muteType: 'chat' | 'mic' | 'all';
      durationMinutes?: number;
      reason?: string;
    }) => roomsService.muteUser(roomId, userId, { muteType, durationMinutes, reason }),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-mutes', roomId] });
    },
  });
};

export const useUnmuteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId, muteType }: {
      roomId: string;
      userId: string;
      muteType?: 'chat' | 'mic' | 'all';
    }) => roomsService.unmuteUser(roomId, userId, muteType),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-mutes', roomId] });
    },
  });
};

/**
 * Verbatim UpdateRoomDto — derived from the service signature so the hook can
 * never drift from the 7 whitelisted fields. Anything else (level, xp,
 * roomCode, publicRoomId, status, ownerId) is stripped by the backend pipe.
 */
export type UpdateRoomInput = Parameters<typeof roomsService.updateAdminRoom>[1];

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: UpdateRoomInput }) =>
      roomsService.updateAdminRoom(roomId, data),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room', roomId, true] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId }: { roomId: string }) => roomsService.deleteAdminRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

/** Pending Room PK join-request queue for a room (waiting list). */
export const useRoomRoundJoinRequests = (roomId: string, enabled = true) => {
  return useQuery({
    queryKey: ['room-round-join-requests', roomId],
    queryFn: () => roomsService.getRoomRoundJoinRequestsAdmin(roomId),
    enabled: !!roomId && enabled,
    staleTime: 5000,
  });
};

/** Strict-roster round creation: every listed player needs a pending join request. */
export const useCreateRoomRound = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, data }: {
      roomId: string;
      data: Parameters<typeof roomsService.createRoomRoundAdmin>[1];
    }) => roomsService.createRoomRoundAdmin(roomId, data),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-round-join-requests', roomId] });
    },
  });
};

export const useCancelRoomRound = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, roundId }: { roomId: string; roundId: string }) =>
      roomsService.cancelRoomRoundAdmin(roomId, roundId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-round-join-requests', roomId] });
    },
  });
};

