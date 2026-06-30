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
  
  const mapped = data.map((user: Record<string, unknown>) => {
    const normalized = {
      id: user.id,
      email: user.email ?? '',
      nickname: user.nickname || user.global_nickname || (user.email as string || '').split('@')[0] || '',
      avatar: user.avatar_url || user.avatar,
      status: user.status || 'active',
      createdAt: user.created_at || user.createdAt || new Date().toISOString(),
      wallet: user.wallet || undefined,
      roles: user.roles || undefined,
    };
    try {
      return UserResponseSchema.parse(normalized);
    } catch {
      return normalized as UserResponse;
    }
  });
  
  return {
    data: mapped,
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length || 20,
    totalPages: raw.totalPages || (raw.total > 0 ? Math.ceil(raw.total / (raw.limit || data.length || 20)) : 1),
  };
}

export const usersService = {
  async getUsers(params?: ListParams): Promise<PaginatedResponse<UserResponse>> {
    const backendParams: Record<string, unknown> = {};
    if (params?.limit) backendParams.limit = params.limit;
    if (params?.page) backendParams.offset = (params.page - 1) * (params.limit || 20);
    if (params?.search) backendParams.search = params.search;
    const response = await apiClient.get<BackendUsersResponse>('/admin/users', { params: backendParams });
    return normalizeUsersResponse(response);
  },

  async getUserById(id: string): Promise<UserResponse> {
    const response = await apiClient.get<any>(`/admin/users/${id}`);
    const userRecord = response?.user;
    if (!userRecord?.id) throw new Error('User not found');
    const mapped = UserResponseSchema.parse({
      id: userRecord.id,
      email: userRecord.email ?? '',
      nickname: userRecord.nickname ?? userRecord.global_nickname ?? userRecord.email?.split('@')[0],
      avatar: userRecord.avatar_url ?? userRecord.avatar,
      status: userRecord.status ?? 'active',
      createdAt: userRecord.created_at ?? userRecord.createdAt ?? new Date().toISOString(),
      wallet: response.wallet ? {
        userId: response.wallet.userId ?? id,
        gold: response.wallet.gold ?? 0,
        gems: response.wallet.gems ?? 0,
      } : undefined,
      roles: (response.roles ?? []).map((code: string) => ({ id: code, code })),
    });
    return mapped;
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
    const w = userResponse?.wallet;
    if (!w) {
      return { userId: id, gold: 0, gems: 0 };
    }
    return {
      userId: w.userId ?? id,
      gold: typeof w.gold === 'number' ? w.gold : parseInt(String(w.gold ?? '0')),
      gems: typeof w.gems === 'number' ? w.gems : parseInt(String(w.gems ?? '0')),
    };
  },
};

export default usersService;