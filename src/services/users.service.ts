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

interface BackendUserRecord {
  id: string;
  immutableUserId?: string | null;
  immutable_user_id?: string | null;
  email?: string;
  nickname?: string | null;
  global_nickname?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

interface BackendWalletRecord {
  userId?: string;
  gameCurrency?: string | number;
  game_currency?: string | number;
}

interface BackendUserDetailResponse {
  user?: BackendUserRecord;
  wallet?: BackendWalletRecord | null;
  roles?: string[];
}

function normalizeUsersResponse(response: unknown): PaginatedResponse<UserResponse> {
  const raw = response as BackendUsersResponse;
  const data = raw.users || raw.data || [];
  
  const mapped = data.map((user: Record<string, unknown>) => {
    const normalized = {
      id: user.id,
      immutableUserId: user.immutableUserId ?? user.immutable_user_id ?? null,
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
    const response = await apiClient.get<BackendUserDetailResponse>(`/admin/users/${id}`);
    const userRecord = response?.user;
    if (!userRecord?.id) throw new Error('User not found');
    const mapped = UserResponseSchema.parse({
      id: userRecord.id,
      immutableUserId:
        userRecord.immutableUserId ?? userRecord.immutable_user_id ?? null,
      email: userRecord.email ?? '',
      nickname: userRecord.nickname ?? userRecord.global_nickname ?? userRecord.email?.split('@')[0],
      avatar: userRecord.avatar_url ?? userRecord.avatar,
      status: userRecord.status ?? 'active',
      createdAt: userRecord.created_at ?? userRecord.createdAt ?? new Date().toISOString(),
      wallet: response.wallet ? {
        userId: response.wallet.userId ?? id,
        gameCurrency: String(response.wallet.gameCurrency ?? response.wallet.game_currency ?? '0'),
      } : undefined,
      // `roles` from GET /admin/users/:id are role CODES ("USER", "ADMIN"), but
      // UserResponseSchema's RoleSchema demands a uuid `id` — mapping them made
      // the whole record fail validation and the detail page error out. Role
      // details are read through getUserRoleDetails() instead.
    });
    return mapped;
  },

  async getUserRoles(id: string): Promise<string[]> {
    const response = await apiClient.get<string[]>(`/admin/users/${id}/roles`);
    return Array.isArray(response) ? response : [];
  },

  async getUserRoleDetails(id: string): Promise<RoleResponse[]> {
    const roleCodes = await this.getUserRoles(id);
    // GET /admin/roles returns a BARE ARRAY of RoleResponseDto (admin.controller
    // `getAllRoles`), not `{ roles: [...] }`.
    const response = await apiClient.get<RoleResponse[]>('/admin/roles');
    const allRoles = Array.isArray(response) ? response : [];
    return allRoles.filter((role) => roleCodes.includes(role.code));
  },

  /**
   * PATCH /admin/users/:id/status — admin.service.updateUserStatus accepts
   * exactly `active | suspended | banned` (users.write). The route param accepts
   * either the immutable numeric user id or the internal UUID.
   */
  async updateStatus(id: string, status: UserResponse['status']): Promise<void> {
    await apiClient.patch(`/admin/users/${id}/status`, { status });
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

  /**
   * Returns `null` (not a fake zero balance) when the user has no wallet row
   * yet — GET /admin/users/:id's `wallet` is only present once one exists.
   */
  async getUserWallet(id: string): Promise<Wallet | null> {
    const userResponse = await apiClient.get<BackendUserDetailResponse>(`/admin/users/${id}`);
    const w = userResponse?.wallet;
    if (!w) return null;
    return {
      userId: w.userId ?? id,
      gameCurrency: String(w.gameCurrency ?? w.game_currency ?? '0'),
    };
  },
};

export default usersService;
