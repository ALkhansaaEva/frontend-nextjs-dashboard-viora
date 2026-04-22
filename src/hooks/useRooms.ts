import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '@/services';
import type { ListParams, PaginatedResponse } from '@/types';

interface Room {
  id: string;
  roomCode: string;
  name: Record<string, string>;
  level: number;
  updatedAt: string;
  memberCount?: number;
}

export const useRooms = (params?: ListParams) => {
  return useQuery<PaginatedResponse<Room>>({
    queryKey: ['rooms', params],
    queryFn: () => roomsService.getRooms(params),
    staleTime: 30000,
  });
};

export const useRoom = (roomId: string) => {
  return useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsService.getRoomById(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomMembers = (roomId: string) => {
  return useQuery({
    queryKey: ['room-members', roomId],
    queryFn: () => roomsService.getRoomMembers(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomBans = (roomId: string) => {
  return useQuery({
    queryKey: ['room-bans', roomId],
    queryFn: () => roomsService.getBans(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomMutes = (roomId: string) => {
  return useQuery({
    queryKey: ['room-mutes', roomId],
    queryFn: () => roomsService.getMutes(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomKicks = (roomId: string) => {
  return useQuery({
    queryKey: ['room-kicks', roomId],
    queryFn: () => roomsService.getKicks(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useRoomModerators = (roomId: string) => {
  return useQuery({
    queryKey: ['room-moderators', roomId],
    queryFn: () => roomsService.getModerators(roomId),
    enabled: !!roomId,
    staleTime: 30000,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: Record<string, string> }) =>
      roomsService.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useKickUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsService.kickUser(roomId, userId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsService.banUser(roomId, userId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-members', roomId] });
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
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsService.muteUser(roomId, userId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-mutes', roomId] });
    },
  });
};

export const useUnmuteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, userId }: { roomId: string; userId: string }) =>
      roomsService.unmuteUser(roomId, userId),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['room-mutes', roomId] });
    },
  });
};

export const useCloseRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsService.closeRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useReopenRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) => roomsService.reopenRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};