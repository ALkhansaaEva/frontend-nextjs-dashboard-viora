import apiClient from "@/lib/api/api-client";
import {
  RoleResponseSchema,
  type RoleResponse,
} from "@/dto/admin/get-roles.response";
import { AssignPermissionSchema } from "@/dto/admin/assign-permission.request";
import type {
  Role,
  Permission,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreatePermissionRequest,
  ListParams,
  PaginatedResponse,
  User,
  AdjustBalanceRequest,
} from "@/types";

interface BackendAdminUserRow {
  id: string;
  immutableUserId?: string;
  immutable_user_id?: string;
  email?: string;
  nickname?: string | null;
  global_nickname?: string | null;
  title?: string;
  status?: User["status"];
  roles?: Role[];
  createdAt?: string;
  created_at?: string;
  lastLogin?: string;
  last_login?: string;
  gameCurrency?: string | number;
  game_currency?: string | number;
  avatar?: string;
  avatar_url?: string;
  wallet?: { userId?: string; gameCurrency?: string | number } | null;
}

interface BackendRoleUserRow {
  userId?: string;
  id?: string;
  immutableUserId?: string;
  immutable_user_id?: string;
  email?: string;
  nickname?: string | null;
  global_nickname?: string | null;
  username?: string;
  assignedAt?: string;
  createdAt?: string;
  created_at?: string;
}

interface CatalogItemRef {
  code?: string;
  type?: string;
  slot?: string;
  rarity?: string;
  title?: { en?: string; ar?: string } | null;
  assets?: Array<{ url?: string } | null> | null;
}

/** Fields resolved once from the catalog entry nested in the payload. */
export interface AdminCatalogFields {
  name?: string;
  iconUrl?: string;
  itemType?: string;
  slot?: string;
  rarity?: string;
  itemId?: string;
}

export type AdminInventoryItem = AdminCatalogFields & {
  id?: string;
  quantity?: string | number;
  status?: string;
  isEquipped?: boolean;
  acquiredAt?: string;
};

export type AdminPurchaseItem = AdminCatalogFields & {
  id?: string;
  createdAt?: string;
  status?: string;
  amount?: string | number;
  currencyType?: string;
  totalGameCurrencyAmount?: string | number;
  quantity?: string | number;
  itemName?: string;
};

export type AdminLoadoutItem = AdminCatalogFields & {
  id?: string;
  isEquipped?: boolean;
};

function catalogFields(raw: unknown): AdminCatalogFields {
  const row = (raw ?? {}) as {
    item?: CatalogItemRef | null;
    bundle?: CatalogItemRef | null;
    itemId?: string;
    bundleId?: string;
  };
  const entry = row.item ?? row.bundle;
  return {
    name: entry?.title?.en || entry?.title?.ar || entry?.code,
    iconUrl: entry?.assets?.find((asset) => asset?.url)?.url,
    itemType: entry?.type,
    slot: entry?.slot,
    rarity: entry?.rarity,
    itemId: row.itemId ?? row.bundleId,
  };
}

/**
 * Inventory/purchases are wrapped in `{data}`; the loadout endpoint returns a
 * single bare row. Do not fall back to "first array property" here — a loadout
 * row contains an `assets` array and would be mistaken for a list.
 */
function catalogRows<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  const res = (response ?? {}) as Record<string, unknown>;
  if (Array.isArray(res.data)) return res.data as T[];
  if (Array.isArray(res.items)) return res.items as T[];
  if (res.id || res.itemId || res.item) return [res as T];
  return [];
}

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") {
    const res = response as Record<string, unknown>;
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
      response = await apiClient.get<RoleResponse[] | { data: RoleResponse[] }>(
        "/admin/roles",
      );
      const roles = normalizeArrayResponse<RoleResponse>(response);
      return roles.map((role) => RoleResponseSchema.parse(role)) as Role[];
    } catch (error) {
      console.warn("Error parsing roles, returning raw data:", error);
      return normalizeArrayResponse<Role>(response as unknown as Role[]);
    }
  },

  async getRole(code: string): Promise<Role> {
    const roles = await this.getRoles();
    const role = roles.find((r) => r.code === code);
    if (!role) {
      throw new Error(`Role not found: ${code}`);
    }
    return role;
  },

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return apiClient.post<Role>("/admin/roles", data);
  },

  async deleteRole(code: string): Promise<void> {
    await apiClient.delete(`/admin/roles/${code}`);
  },

  async updateRole(code: string, data: UpdateRoleRequest): Promise<Role> {
    return apiClient.put(`/admin/roles/${code}`, data) as Promise<Role>;
  },

  async setRoleAsDefault(
    code: string,
  ): Promise<{ status: string; roleCode: string }> {
    return apiClient.post(`/admin/roles/${code}/set-default`, {}) as Promise<{
      status: string;
      roleCode: string;
    }>;
  },

  async getRolePermissions(roleCode: string): Promise<string[]> {
    const response = await apiClient.get<string[] | { data: string[] }>(
      `/admin/roles/${roleCode}/permissions`,
    );
    return normalizeArrayResponse<string>(response);
  },

  async assignPermissionToRole(
    roleCode: string,
    permissionCode: string,
  ): Promise<void> {
    const validated = AssignPermissionSchema.parse({ permissionCode });
    await apiClient.post(
      `/admin/roles/${roleCode}/permissions/assign`,
      validated,
    );
  },

  async revokePermissionFromRole(
    roleCode: string,
    permissionCode: string,
  ): Promise<void> {
    const validated = AssignPermissionSchema.parse({ permissionCode });
    await apiClient.post(
      `/admin/roles/${roleCode}/permissions/revoke`,
      validated,
    );
  },

  async getPermissions(): Promise<Permission[]> {
    const response = await apiClient.get<Permission[] | { data: Permission[] }>(
      "/admin/permissions",
    );
    return normalizeArrayResponse<Permission>(response);
  },

  async createPermission(data: CreatePermissionRequest): Promise<Permission> {
    return apiClient.post<Permission>("/admin/permissions", data);
  },

  // Backend has no DELETE endpoint for permissions; manage via enable/disable
  async deletePermission(id: string): Promise<void> {
    void id;
    console.warn(
      "[AdminService] deletePermission is not supported by the backend (no DELETE /admin/permissions/:id)",
    );
  },

  async getUsers(params?: ListParams): Promise<PaginatedResponse<User>> {
    const backendParams: Record<string, unknown> = {};
    if (params?.limit) backendParams.limit = params.limit;
    if (params?.page)
      backendParams.offset = (params.page - 1) * (params.limit || 20);
    if (params?.search) backendParams.search = params.search;
    const response = await apiClient.get<
      { users: BackendAdminUserRow[]; total: number } | PaginatedResponse<User>
    >("/admin/users", { params: backendParams });
    if (response && "users" in response) {
      const limit = params?.limit || 20;
      const page = params?.page || 1;
      const total = response.total || 0;
      const data: User[] = response.users.map((u) => ({
        id: u.id,
        immutableUserId: u.immutable_user_id || u.immutableUserId || "",
        email: u.email || "",
        nickname:
          u.nickname || u.global_nickname || u.email?.split("@")[0] || "",
        title: u.title,
        status: u.status || "active",
        roles: u.roles || [],
        createdAt:
          u.created_at ||
          u.createdAt ||
          u.createdAt ||
          new Date().toISOString(),
        lastLogin: u.last_login || u.lastLogin,
        // GET /admin/users joins `w.game_currency` (raw SQL, snake_case) per
        // row; GET /admin/users/:id returns the full Wallet entity instead
        // (camelCase `gameCurrency`) — tolerate both. A LEFT JOIN miss (user
        // has no wallet row yet) comes through as `null`/`undefined`, which
        // must stay undefined here — NOT coerced to "0" — so the UI can tell
        // "balance is genuinely zero" apart from "no wallet data".
        wallet: u.wallet
          ? {
              userId: u.wallet.userId ?? u.id,
              gameCurrency: String(u.wallet.gameCurrency),
            }
          : (u.game_currency ?? u.gameCurrency) != null
            ? {
                userId: u.id,
                gameCurrency: String(u.game_currency ?? u.gameCurrency),
              }
            : undefined,
        avatar: u.avatar_url || u.avatar,
      }));
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
    if (response && "data" in response) {
      return response as PaginatedResponse<User>;
    }
    return {
      data: normalizeArrayResponse<User>(response),
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };
  },

  async getUsersByRole(
    roleCode: string,
    params?: ListParams,
  ): Promise<PaginatedResponse<User>> {
    const backendParams: Record<string, unknown> = {};
    if (params?.limit) backendParams.limit = params.limit;
    if (params?.page)
      backendParams.offset = (params.page - 1) * (params.limit || 20);
    const response = await apiClient.get<{
      users: BackendRoleUserRow[];
      total: number;
    }>(`/admin/roles/${roleCode}/users`, { params: backendParams });

    if (response && "users" in response) {
      const users: User[] = response.users.map((u) => ({
        id: u.userId || u.id,
        immutableUserId: u.immutableUserId || u.immutable_user_id || "",
        email: u.email || "",
        nickname:
          u.nickname ||
          u.global_nickname ||
          (u.email || "").split("@")[0] ||
          "",
        title: undefined,
        status: "active" as const,
        roles: [] as Role[],
        createdAt:
          u.assignedAt ||
          u.created_at ||
          u.createdAt ||
          new Date().toISOString(),
      })) as User[];
      const limit = params?.limit || 20;
      const page = params?.page || 1;
      const total = response.total || 0;
      return {
        data: users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  },

  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`/admin/users/${id}`);
  },

  /**
   * GET /admin/users/:id actually returns `{ user, profile, wallet, roles }`
   * (AdminService.getUserDetails) — nickname/email/status live under `.user`,
   * not at the response root. This is the correctly-shaped accessor for
   * "resolve a UUID to a human identity" call sites (Agents/Distributors);
   * `getUserById` above is kept as-is for existing wallet-reading callers
   * that already (coincidentally) work off the root `.wallet`.
   */
  async getUserIdentity(
    id: string,
  ): Promise<{
    id: string;
    immutableUserId: string;
    nickname: string;
    email: string;
    status: string;
  } | null> {
    try {
      const response = await apiClient.get<{
        user?: {
          id: string;
          immutableUserId?: string;
          immutable_user_id?: string;
          nickname?: string;
          global_nickname?: string;
          email?: string;
          status?: string;
        };
      }>(`/admin/users/${id}`);
      const u = response?.user;
      if (!u) return null;
      return {
        id: u.id,
        immutableUserId: u.immutableUserId || u.immutable_user_id || "",
        nickname:
          u.nickname || u.global_nickname || u.email?.split("@")[0] || "",
        email: u.email || "",
        status: u.status || "active",
      };
    } catch {
      return null;
    }
  },

  async getUserRoles(userId: string): Promise<string[]> {
    const response = await apiClient.get<string[] | { data: string[] }>(
      `/admin/users/${userId}/roles`,
    );
    return normalizeArrayResponse<string>(response);
  },

  async assignRoleToUser(userId: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/roles/assign`, { roleCode });
  },

  async revokeRoleFromUser(userId: string, roleCode: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/roles/revoke`, { roleCode });
  },

  async adjustUserBalance(
    userId: string,
    data: AdjustBalanceRequest,
  ): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/balance`, data);
  },

  async refundPurchase(purchaseId: string, reason: string): Promise<void> {
    await apiClient.post(`/admin/refunds/${purchaseId}`, { reason });
  },

  async getUserInventory(userId: string): Promise<AdminInventoryItem[]> {
    const response = await apiClient.get<unknown>(
      `/admin/users/${userId}/inventory`,
    );
    return catalogRows<AdminInventoryItem>(response).map((row) => ({
      ...row,
      ...catalogFields(row),
    }));
  },

  async getUserPurchases(userId: string): Promise<AdminPurchaseItem[]> {
    const response = await apiClient.get<unknown>(
      `/admin/users/${userId}/purchases`,
    );
    return catalogRows<AdminPurchaseItem>(response).map((row) => ({
      ...row,
      ...catalogFields(row),
    }));
  },

  async getUserLoadout(userId: string): Promise<AdminLoadoutItem[]> {
    const response = await apiClient.get<unknown>(
      `/admin/users/${userId}/loadout`,
    );
    return catalogRows<AdminLoadoutItem>(response).map((row) => ({
      ...row,
      ...catalogFields(row),
    }));
  },

  async searchUsers(params: {
    search?: string;
    query?: string;
    email?: string;
    immutableUserId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<User>> {
    const backendParams: Record<string, unknown> = {};
    if (params?.query) backendParams.query = params.query;
    if (params?.email) backendParams.email = params.email;
    if (params?.immutableUserId)
      backendParams.immutableUserId = params.immutableUserId;
    if (params?.limit) backendParams.limit = params.limit;
    if (params?.offset !== undefined) backendParams.offset = params.offset;
    return apiClient.get<PaginatedResponse<User>>("/admin/users/search", {
      params: backendParams,
    });
  },

  async updateUserStatus(userId: string, status: string): Promise<void> {
    await apiClient.patch(`/admin/users/${userId}/status`, { status });
  },

  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const response = await apiClient.get<
      string[] | { data: string[]; permissions?: string[] }
    >(`/admin/users/${userId}/permissions`);
    if (Array.isArray(response)) return response;
    const r = response as { data: string[]; permissions?: string[] };
    if (r.permissions) return r.permissions;
    if (r.data) return r.data;
    return [];
  },

  async getUserPermissionOverrides(
    userId: string,
  ): Promise<
    Array<{
      permissionCode: string;
      type: "grant" | "revoke";
      reason?: string;
      createdAt: string;
      createdBy: string;
    }>
  > {
    const response = await apiClient.get<
      unknown[] | { data: unknown[]; overrides?: unknown[] }
    >(`/admin/users/${userId}/permissions/overrides`);
    if (Array.isArray(response))
      return response as Array<{
        permissionCode: string;
        type: "grant" | "revoke";
        reason?: string;
        createdAt: string;
        createdBy: string;
      }>;
    const r = response as { data: unknown[]; overrides?: unknown[] };
    if (r.overrides)
      return r.overrides as Array<{
        permissionCode: string;
        type: "grant" | "revoke";
        reason?: string;
        createdAt: string;
        createdBy: string;
      }>;
    if (r.data)
      return r.data as Array<{
        permissionCode: string;
        type: "grant" | "revoke";
        reason?: string;
        createdAt: string;
        createdBy: string;
      }>;
    return [];
  },

  async grantPermissionOverride(
    userId: string,
    permissionCode: string,
    reason?: string,
  ): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/permissions/grant`, {
      permissionCode,
      reason,
    });
  },

  async revokePermissionOverride(
    userId: string,
    permissionCode: string,
    reason?: string,
  ): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/permissions/revoke`, {
      permissionCode,
      reason,
    });
  },

  async removePermissionOverride(
    userId: string,
    permissionCode: string,
  ): Promise<void> {
    await apiClient.delete(
      `/admin/users/${userId}/permissions/overrides/${permissionCode}`,
    );
  },
};

export default adminService;
