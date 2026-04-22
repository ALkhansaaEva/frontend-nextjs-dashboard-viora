import apiClient from '@/lib/api/api-client';
import { RoleResponseSchema, type RoleResponse } from '@/dto/admin/get-roles.response';
import { AssignPermissionSchema } from '@/dto/admin/assign-permission.request';
import type { Role, Permission, CreateRoleRequest, UpdateRoleRequest, CreatePermissionRequest, ListParams, PaginatedResponse, User, AdjustBalanceRequest } from '@/types';

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const res = response as any;
    // Check common wrapper keys
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.permissions)) return res.permissions;
    if (Array.isArray(res.roles)) return res.roles;
    if (Array.isArray(res.items)) return res.items;

    // Last resort: find any property that is an array
    for (const key in res) {
      if (Array.isArray(res[key])) return res[key];
    }
  }
  return [];
}

export const adminService = {
  async getRoles(): Promise<Role[]> {
    let response: unknown;
    try {
      response = await apiClient.get<RoleResponse[] | { data: RoleResponse[] }>('/admin/roles');
      const roles = normalizeArrayResponse<RoleResponse>(response);
      return roles.map(role => RoleResponseSchema.parse(role)) as Role[];
    } catch (error) {
      console.warn('Error parsing roles, returning raw data:', error);
      return normalizeArrayResponse<Role>(response as unknown as Role[]);
    }
  },

  async getRole(code: string): Promise<Role> {
    const roles = await this.getRoles();
    const role = roles.find(r => r.code === code);
    if (!role) {
      throw new Error(`Role not found: ${code}`);
    }
    return role;
  },

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return apiClient.post<Role>('/admin/roles', data);
  },

  async deleteRole(code: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${code}`);
  },

  async updateRole(code: string, data: UpdateRoleRequest): Promise<Role> {
    return apiClient.put(`/admin/roles/${code}`, data) as Promise<Role>;
  },

  async getRolePermissions(roleCode: string): Promise<string[]> {
    const response = await apiClient.get<string[] | { data: string[] }>(`/admin/roles/${roleCode}/permissions`);
    return normalizeArrayResponse<string>(response);
  },

  async assignPermissionToRole(roleCode: string, permissionCode: string): Promise<void> {
    const validated = AssignPermissionSchema.parse({ permissionCode });
    await apiClient.post(`/admin/roles/${roleCode}/permissions/assign`, validated);
  },

  async revokePermissionFromRole(roleCode: string, permissionCode: string): Promise<void> {
    const validated = AssignPermissionSchema.parse({ permissionCode });
    await apiClient.post(`/admin/roles/${roleCode}/permissions/revoke`, validated);
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[] | { data: Permission[] }>('/admin/permissions');
    return normalizeArrayResponse<Permission>(response);
  },

  async createPermission(data: CreatePermissionRequest): Promise<Permission> {
    return apiClient.post<Permission>('/admin/permissions', data);
  },

  async deletePermission(id: string): Promise<void> {
    await apiClient.delete(`/admin/permissions/${id}`);
  },

  async getUsers(params?: ListParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<{ users: User[]; total: number } | PaginatedResponse<User>>('/admin/users', { params });
    if (response && 'users' in response) {
      const limit = params?.limit || 20;
      const page = params?.page || 1;
      return { 
        data: response.users, 
        total: response.total,
        page,
        limit,
        totalPages: Math.ceil(response.total / limit)
      };
    }
    if (response && 'data' in response) {
      return response as PaginatedResponse<User>;
    }
    return { data: normalizeArrayResponse<User>(response), total: 0, page: 1, limit: 20, totalPages: 0 };
  },

  async getUsersByRole(roleCode: string, params?: ListParams): Promise<PaginatedResponse<User>> {
    const response = await apiClient.get<{ users: { userId: string; immutableUserId: string; email: string; nickname: string | null; username: string; assignedAt: string }[]; total: number }>(
      `/admin/roles/${roleCode}/users`,
      { params }
    );
    
    if (response && 'users' in response) {
      const users = response.users.map(u => ({
        id: u.userId,
        immutableUserId: u.immutableUserId,
        email: u.email,
        nickname: u.nickname || '',
        title: undefined,
        status: 'active' as const,
        roles: [] as Role[],
        createdAt: u.assignedAt,
      })) as User[];
      const limit = params?.limit || 20;
      const page = params?.page || 1;
      return { 
        data: users, 
        total: response.total,
        page,
        limit,
        totalPages: Math.ceil(response.total / limit)
      };
    }
    
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  },

  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`/admin/users/${id}`);
  },

  async getUserRoles(userId: string): Promise<string[]> {
    const response = await apiClient.get<string[] | { data: string[] }>(`/admin/users/${userId}/roles`);
    return normalizeArrayResponse<string>(response);
  },

  async assignRoleToUser(userId: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/roles/assign`, { roleCode });
  },

  async revokeRoleFromUser(userId: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/roles/revoke`, { roleCode });
  },

  async adjustUserBalance(userId: string, data: AdjustBalanceRequest): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/balance`, data);
  },

  async refundPurchase(purchaseId: string, reason: string): Promise<void> {
    await apiClient.post(`/admin/refunds/${purchaseId}`, { reason });
  },

  async getUserInventory(userId: string): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>(`/admin/users/${userId}/inventory`);
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async getUserPurchases(userId: string): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>(`/admin/users/${userId}/purchases`);
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async getUserLoadout(userId: string): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>(`/admin/users/${userId}/loadout`);
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async searchUsers(params: { search?: string; limit?: number; offset?: number }): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>('/admin/users/search', { params });
  },

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/status`, { status });
  },
};

export default adminService;