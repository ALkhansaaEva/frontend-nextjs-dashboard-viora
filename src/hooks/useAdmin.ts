'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services';
import type { Role, Permission, CreateRoleRequest, UpdateRoleRequest, ListParams, PaginatedResponse, User } from '@/types';

const defaultStaleTime = 60000;

export const usePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => adminService.getPermissions(),
    staleTime: defaultStaleTime,
  });
};

export const useRoles = (params?: ListParams) => {
  return useQuery<Role[]>({
    queryKey: ['roles', params],
    queryFn: () => adminService.getRoles(),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
};

export const useRole = (code: string) => {
  return useQuery<Role>({
    queryKey: ['role', code],
    queryFn: () => adminService.getRole(code),
    enabled: !!code,
    staleTime: defaultStaleTime,
  });
};

export const useRolePermissions = (roleCode: string) => {
  return useQuery<string[]>({
    queryKey: ['role-permissions', roleCode],
    queryFn: () => adminService.getRolePermissions(roleCode),
    enabled: !!roleCode,
    staleTime: defaultStaleTime,
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) => adminService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, data }: { code: string; data: UpdateRoleRequest }) => 
      adminService.updateRole(code, data),
    onSuccess: (_, { code }) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', code] });
    },
  });
};

export const useAssignPermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleCode, permissionCode }: { roleCode: string; permissionCode: string }) =>
      adminService.assignPermissionToRole(roleCode, permissionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['roles'] });
    },
  });
};

export const useRevokePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleCode, permissionCode }: { roleCode: string; permissionCode: string }) =>
      adminService.revokePermissionFromRole(roleCode, permissionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onSettled: () => {
      queryClient.refetchQueries({ queryKey: ['roles'] });
    },
  });
};

export const useAdminUsers = (params?: ListParams) => {
  return useQuery<PaginatedResponse<User>>({
    queryKey: ['admin-users', params],
    queryFn: () => adminService.getUsers(params),
    staleTime: 30000,
  });
};

export const useAdminUser = (id: string) => {
  return useQuery<User>({
    queryKey: ['admin-user', id],
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
    staleTime: 30000,
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => adminService.deleteRole(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { code: string; name: string; description?: string }) => 
      adminService.createPermission(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
};

export const useAssignRoleToUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
      adminService.assignRoleToUser(userId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useRevokeRoleFromUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleCode }: { userId: string; roleCode: string }) =>
      adminService.revokeRoleFromUser(userId, roleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};