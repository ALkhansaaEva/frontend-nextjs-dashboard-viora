import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services';
import type { PaginatedResponse, ListParams, Role, Wallet } from '@/types';
import type { UserResponse, AdjustBalanceRequest } from '@/dto/users/users.dto';

export const useUsers = (params?: ListParams) => {
  return useQuery<PaginatedResponse<UserResponse>>({
    queryKey: ['users', params],
    queryFn: () => usersService.getUsers(params),
    staleTime: 30000,
  });
};

export const useUser = (id: string) => {
  return useQuery<UserResponse>({
    queryKey: ['user', id],
    queryFn: () => usersService.getUserById(id),
    enabled: !!id,
    staleTime: 30000,
  });
};

export const useUserRoles = (userId: string) => {
  return useQuery<Role[]>({
    queryKey: ['user-roles', userId],
    queryFn: () => usersService.getUserRoleDetails(userId),
    enabled: !!userId,
    staleTime: 60000,
  });
};

export const useAssignRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
      usersService.assignRole(userId, roleCode),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    },
  });
};

export const useRevokeRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
      usersService.revokeRole(userId, roleCode),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-roles', userId] });
    },
  });
};

export const useAdjustBalance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: AdjustBalanceRequest }) =>
      usersService.adjustBalance(userId, data),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

export const useUserWallet = (userId: string) => {
  return useQuery<Wallet | null>({
    queryKey: ['user-wallet', userId],
    queryFn: () => usersService.getUserWallet(userId),
    enabled: !!userId,
    staleTime: 30000,
  });
};