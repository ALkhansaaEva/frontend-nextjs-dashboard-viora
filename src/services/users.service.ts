import apiClient from '@/lib/api/api-client';
import { UserResponseSchema, type UserResponse, AdjustBalanceSchema, type AdjustBalanceRequest } from '@/dto/users/users.dto';
import { RoleResponse } from '@/dto/admin/get-roles.response';
import type { PaginatedResponse, ListParams, Wallet } from '@/types';

interface BackendUsersResponse {
  users?: UserResponse[];
  data?: UserResponse[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function normalizeUsersResponse(response: unknown): PaginatedResponse<UserResponse> {
  const raw = response as BackendUsersResponse;
  const data = raw.users || raw.data || [];
  
  return {
    data: data.map((user: UserResponse) => {
      try {
        return UserResponseSchema.parse(user);
      } catch {
        return user;
      }
    }),
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
  };
}

export const usersService = {
  async getUsers(params?: ListParams): Promise<PaginatedResponse<UserResponse>> {
    const response = await apiClient.get<BackendUsersResponse>('/admin/users', { params });
    return normalizeUsersResponse(response);
  },

  async getUserById(id: string): Promise<UserResponse> {
    const response = await apiClient.get<BackendUsersResponse>(`/admin/users/${id}`);
    const data = response.users || response.data?.[0];
    if (!data) throw new Error('User not found');
    return UserResponseSchema.parse(data);
  },

  async getUserRoles(id: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/admin/users/${id}/roles`);
    return Array.isArray(response) ? response : [];
  },

  async getUserRoleDetails(id: string): Promise<RoleResponse[]> {
    const roleCodes = await this.getUserRoles(id);
    const rolesResponse = await apiClient.get<{ roles: RoleResponse[] }>('/admin/roles');
    const allRoles = rolesResponse.roles || [];
    return allRoles.filter(r => roleCodes.includes(r.code));
  },

  async assignRole(id: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${id}/roles/assign`, { roleCode });
  },

  async revokeRole(id: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${id}/roles/revoke`, { roleCode });
  },

  async adjustBalance(id: string, data: AdjustBalanceRequest): Promise<Wallet> {
    const validated = AdjustBalanceSchema.parse(data);
    return apiClient.post<Wallet>(`/admin/users/${id}/balance`, validated);
  },

  async getUserWallet(id: string): Promise<Wallet> {
    const userResponse = await apiClient.get<any>(`/admin/users/${id}`);
    if (!userResponse.wallet) {
      return { userId: id, gold: 0, gems: 0 };
    }
    return userResponse.wallet;
  },
};

export default usersService;