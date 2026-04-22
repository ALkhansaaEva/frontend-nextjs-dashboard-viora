'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialService } from '@/services';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'friends' | 'pending' | 'blocked';
  createdAt: string;
  friend?: {
    id: string;
    nickname: string;
    avatar?: string;
    status?: string;
  };
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  sender?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

export const useFriends = () => {
  return useQuery<Friend[]>({
    queryKey: ['friends'],
    queryFn: () => socialService.getFriends(),
    staleTime: 30000,
  });
};

export const useMessages = (friendId: string) => {
  return useQuery<Message[]>({
    queryKey: ['messages', friendId],
    queryFn: () => socialService.getMessages(friendId),
    enabled: !!friendId,
    staleTime: 10000,
  });
};

export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialService.sendFriendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => socialService.acceptFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => socialService.rejectFriendRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialService.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialService.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useMuteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialService.muteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};

export const useUnmuteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => socialService.unmuteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
};