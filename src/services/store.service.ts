import apiClient from '@/lib/api/api-client';
import {
  CreateStoreItemSchema, type CreateStoreItemRequest,
  CreateStoreBundleSchema, type CreateStoreBundleRequest,
  UpdateStoreItemSchema, UpdateStoreBundleSchema
} from '@/dto/store';
import type { PaginatedResponse, ListParams } from '@/types';

export interface StoreItem {
  id: string;
  code: string;
  type: string;
  slot: string;
  scope: string;
  gameType?: string;
  rarity: string;
  isDefault: boolean;
  title: Record<string, string>;
  description?: Record<string, string>;
  assets: Asset[];
  styleConfig: Record<string, unknown>;
  /** Backend `StoreItem.priceGameCurrency` — numeric(30,0), read back as a
   * string; `null` when the item has no price set (not for sale directly). */
  priceGameCurrency: string | null;
  isActive: boolean;
  isStackable: boolean;
  defaultExpiryHours: number | null;
  /** Edit-only on the backend (UpdateItemDto); null when never scheduled. */
  availabilityStartsAt?: string | null;
  availabilityEndsAt?: string | null;
  /** Edit-only ordering weight on the backend (UpdateItemDto). */
  displayPriority?: number;
  /** Edit-only availability flag on the backend (UpdateItemDto). */
  isLimitedTime?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Asset {
  id: string;
  kind: string;
  purpose: string;
  platform: string;
  url: string;
  hash: string;
  version: number;
  sizeBytes: number;
  meta: Record<string, unknown>;
  tags: string[];
}

/** Body of POST /store/admin/items/:id/assets (CreateItemAssetDto). */
export type CreateAssetPayload = {
  kind: string;
  purpose: string;
  url: string;
  platform?: string;
  version?: number;
  tags?: string[];
};

export interface StoreBundleItem {
  id: string;
  bundleId: string;
  itemId: string;
  quantity: number;
  item?: StoreItem;
}

export interface StoreBundle {
  id: string;
  sku: string;
  title: Record<string, string>;
  description?: Record<string, string>;
  /** Backend `StoreBundle.priceGameCurrency` — numeric(30,0), required, read back as a string. */
  priceGameCurrency: string;
  isActive: boolean;
  items?: StoreBundleItem[];
  createdAt?: string;
  updatedAt?: string;
}

interface InventoryItem {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  updatedAt: string;
  item?: StoreItem;
}

interface LoadoutItem {
  slot: string;
  inventoryId: string;
  item: StoreItem;
}

/** GET /store/admin/stats — nested counters, not the flat shape we assumed. */
export interface StoreStats {
  items: { total: number; active: number };
  bundles: { total: number; active: number };
  purchases: { total: number; last7Days: number };
  revenue: { last7DaysGameCurrency: number };
}

/** Filters the admin item list actually accepts. */
export interface AdminItemParams extends ListParams {
  isActive?: boolean;
  scope?: string;
  gameType?: string;
  slot?: string;
}

export interface AdminBundleParams extends ListParams {
  isActive?: boolean;
}

export interface AdminPurchaseParams extends ListParams {
  userId?: string;
  itemId?: string;
  bundleId?: string;
  status?: string;
}

/** Every admin list answers `{ data, total, limit, offset }` — no page/totalPages. */
interface RawPaginatedResponse<T> {
  data?: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

function normalizePaginatedResponse<T>(
  raw: RawPaginatedResponse<T>,
  requested: { page: number; limit: number },
): PaginatedResponse<T> {
  const data = raw.data ?? [];
  const total = raw.total ?? data.length;
  const limit = raw.limit || requested.limit;
  const offset = raw.offset ?? (requested.page - 1) * requested.limit;

  return {
    data,
    total,
    page: Math.floor(offset / limit) + 1,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Public list endpoints answer a bare array. */
function toArray<T>(response: T[] | { data?: T[] }): T[] {
  if (Array.isArray(response)) return response;
  return response.data ?? [];
}

export const storeService = {
  // ==================== PUBLIC ====================

  /** GET /store/items — bare array, active only. Accepts scope/gameType/slot only. */
  async getItems(filters?: {
    scope?: string;
    gameType?: string;
    slot?: string;
  }): Promise<StoreItem[]> {
    const searchParams = new URLSearchParams();
    if (filters?.scope) searchParams.set('scope', filters.scope);
    if (filters?.gameType) searchParams.set('gameType', filters.gameType);
    if (filters?.slot) searchParams.set('slot', filters.slot);

    const query = searchParams.toString();
    const url = query ? `/store/items?${query}` : '/store/items';

    return toArray(await apiClient.get<StoreItem[] | { data: StoreItem[] }>(url));
  },

  /** GET /store/bundles — bare array, active only. */
  async getBundles(): Promise<StoreBundle[]> {
    return toArray(await apiClient.get<StoreBundle[] | { data: StoreBundle[] }>('/store/bundles'));
  },

  async purchaseBundle(bundleId: string): Promise<void> {
    await apiClient.post(`/store/purchase/${bundleId}`);
  },

  async purchaseItem(itemId: string): Promise<void> {
    await apiClient.post(`/store/purchase/item/${itemId}`);
  },

  /**
   * GET /store/inventory — bare array, unpaginated. It accepts only
   * sortBy/filter/gameType/slot (no limit/offset, no total).
   */
  async getInventory(filters?: {
    sortBy?: 'rarity' | 'acquiredAt' | 'gameType' | 'slot';
    filter?: 'equipped' | 'available' | 'expired';
    gameType?: string;
    slot?: string;
  }): Promise<InventoryItem[]> {
    const searchParams = new URLSearchParams();
    if (filters?.sortBy) searchParams.set('sortBy', filters.sortBy);
    if (filters?.filter) searchParams.set('filter', filters.filter);
    if (filters?.gameType) searchParams.set('gameType', filters.gameType);
    if (filters?.slot) searchParams.set('slot', filters.slot);

    const query = searchParams.toString();
    return toArray(
      await apiClient.get<InventoryItem[] | { data: InventoryItem[] }>(
        query ? `/store/inventory?${query}` : '/store/inventory',
      ),
    );
  },

  async equipItem(inventoryId: string): Promise<void> {
    await apiClient.post(`/store/equip/${inventoryId}`);
  },

  async unequipItem(slot: string): Promise<void> {
    await apiClient.delete(`/store/equip/${slot}`);
  },

  async getLoadout(): Promise<LoadoutItem[]> {
    return toArray(
      await apiClient.get<LoadoutItem[] | { data: LoadoutItem[] }>('/store/loadout/me'),
    );
  },

  async getReceivedGifts(): Promise<unknown[]> {
    return toArray(
      await apiClient.get<unknown[] | { data: unknown[] }>('/store/gifts/received'),
    );
  },

  async acceptGift(giftId: string): Promise<void> {
    await apiClient.post(`/store/gifts/${giftId}/accept`);
  },

  async declineGift(giftId: string): Promise<void> {
    await apiClient.post(`/store/gifts/${giftId}/decline`);
  },

  async getSentGifts(): Promise<unknown[]> {
    return toArray(await apiClient.get<unknown[] | { data: unknown[] }>('/store/gifts/sent'));
  },

  // ==================== ADMIN: ITEMS ====================

  /** POST /store/items — the create route is NOT namespaced under /store/admin. */
  async createItem(data: CreateStoreItemRequest): Promise<StoreItem> {
    const validated = CreateStoreItemSchema.parse(data);
    return apiClient.post<StoreItem>('/store/items', validated);
  },

  /**
   * PATCH /store/admin/items/:id. `UpdateStoreItemSchema` omits `code` and
   * `styleConfig` (immutable / create-only server-side) and strips them here,
   * so no caller can send them on an update.
   *
   * Two backend rules this has to absorb:
   *  - `UpdateItemDto` makes every field optional, but the zod schema is derived
   *    from the create schema, so `.partial()` is applied here. Without it a
   *    payload that omits `assets` (the normal edit: the form only re-sends them
   *    when they actually changed) fails validation before the request is made.
   *  - `store-admin-item.service.updateItemAdmin` rejects a body carrying BOTH
   *    pricing/stackability and `assets` ("must be submitted separately"), so an
   *    asset edit goes out as two requests: scalars+assets, then pricing alone.
   */
  async updateItem(id: string, data: Partial<CreateStoreItemRequest>): Promise<StoreItem> {
    const { assets, priceGameCurrency, isStackable, ...scalars } = data;
    const hasPricing = priceGameCurrency !== undefined || isStackable !== undefined;

    const body = UpdateStoreItemSchema.partial().parse(
      assets === undefined ? scalars : { ...scalars, assets },
    );
    // The first response is the one returned: it carries `assets`, the pricing
    // response does not (it is saved without the relation loaded).
    const saved = await apiClient.patch<StoreItem>(`/store/admin/items/${id}`, body);

    if (hasPricing) {
      await apiClient.patch<StoreItem>(`/store/admin/items/${id}`, {
        priceGameCurrency,
        isStackable,
      });
    }
    return saved;
  },

  /** DELETE /store/admin/items/:id — deactivates unless `?hard=true`. */
  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${id}`);
  },

  /** GET /store/admin/items — `{ data, total, limit, offset }`. */
  async getAdminItems(params?: AdminItemParams): Promise<PaginatedResponse<StoreItem>> {
    const page = params?.page ?? 1;
    const limit = params?.limit || 20;
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.scope) searchParams.set('scope', params.scope);
    if (params?.gameType) searchParams.set('gameType', params.gameType);
    if (params?.slot) searchParams.set('slot', params.slot);
    if (params?.search) searchParams.set('search', params.search);
    searchParams.set('limit', String(limit));
    searchParams.set('offset', String((page - 1) * limit));

    const response = await apiClient.get<RawPaginatedResponse<StoreItem>>(
      `/store/admin/items?${searchParams}`,
    );
    return normalizePaginatedResponse(response, { page, limit });
  },

  /** GET /store/admin/items/:id — the only item-by-id route that exists. */
  async getAdminItemById(id: string): Promise<StoreItem> {
    return apiClient.get<StoreItem>(`/store/admin/items/${id}`);
  },

  /** POST /store/admin/items/:id/assets — one CreateItemAssetDto, not a list. */
  async addAssetToItem(itemId: string, asset: CreateAssetPayload): Promise<Asset> {
    return apiClient.post<Asset>(`/store/admin/items/${itemId}/assets`, asset);
  },

  /** POST /store/admin/items/:id/assets/bulk — `{ assets: CreateItemAssetDto[] }`. */
  async addAssetsToItem(
    itemId: string,
    assets: CreateAssetPayload[],
  ): Promise<{ success: boolean; message: string; assets: Asset[] }> {
    return apiClient.post<{ success: boolean; message: string; assets: Asset[] }>(
      `/store/admin/items/${itemId}/assets/bulk`,
      { assets },
    );
  },

  /** PATCH /store/admin/items/:id/assets — per-asset update, keyed by `id`. */
  async updateItemAssets(
    itemId: string,
    assets: Array<{
      id: string;
      kind?: string;
      purpose?: string;
      platform?: string;
      url?: string;
      sizeBytes?: number;
      meta?: Record<string, unknown>;
      tags?: string[];
    }>,
  ): Promise<{ success: boolean; message: string; assets: Asset[] }> {
    return apiClient.patch<{ success: boolean; message: string; assets: Asset[] }>(
      `/store/admin/items/${itemId}/assets`,
      { assets },
    );
  },

  /** DELETE /store/admin/items/:id/assets/:assetId */
  async deleteAssetFromItem(itemId: string, assetId: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${itemId}/assets/${assetId}`);
  },

  // ==================== ADMIN: BUNDLES ====================

  /** POST /store/bundles — accepts `items[]`; the server hardcodes isActive:true. */
  async createBundle(data: CreateStoreBundleRequest): Promise<StoreBundle> {
    const validated = CreateStoreBundleSchema.parse(data);
    return apiClient.post<StoreBundle>('/store/bundles', validated);
  },

  async updateBundle(id: string, data: Partial<CreateStoreBundleRequest>): Promise<StoreBundle> {
    // Validate unconditionally: gating on `data.title` let any payload without
    // a title skip the schema entirely. `items` is stripped because
    // UpdateBundleDto does not declare it and the whitelist pipe drops it
    // silently, which reads as "save did nothing".
    const { items: _items, ...rest } = data;
    const validated = UpdateStoreBundleSchema.parse(rest);
    return apiClient.patch<StoreBundle>(`/store/admin/bundles/${id}`, validated);
  },

  async deleteBundle(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/bundles/${id}`);
  },

  /** GET /store/admin/bundles — `{ data, total, limit, offset }`. */
  async getAdminBundles(params?: AdminBundleParams): Promise<PaginatedResponse<StoreBundle>> {
    const page = params?.page ?? 1;
    const limit = params?.limit || 20;
    const searchParams = new URLSearchParams();
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.search) searchParams.set('search', params.search);
    searchParams.set('limit', String(limit));
    searchParams.set('offset', String((page - 1) * limit));

    const response = await apiClient.get<RawPaginatedResponse<StoreBundle>>(
      `/store/admin/bundles?${searchParams}`,
    );
    return normalizePaginatedResponse(response, { page, limit });
  },

  /** GET /store/admin/bundles/:id — the only bundle-by-id route that exists. */
  async getAdminBundleById(id: string): Promise<StoreBundle> {
    return apiClient.get<StoreBundle>(`/store/admin/bundles/${id}`);
  },

  /** POST /store/admin/bundles/:id/items — `{ itemId, quantity? }`. */
  async addItemToBundle(
    bundleId: string,
    item: { itemId: string; quantity?: number },
  ): Promise<StoreBundleItem> {
    return apiClient.post<StoreBundleItem>(`/store/admin/bundles/${bundleId}/items`, item);
  },

  async removeItemFromBundle(bundleId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/store/admin/bundles/${bundleId}/items/${itemId}`);
  },

  // ==================== ADMIN: OPS ====================

  /** GET /store/admin/purchases — `{ data, total, limit, offset }`. */
  async getAdminPurchases(params?: AdminPurchaseParams): Promise<PaginatedResponse<unknown>> {
    const page = params?.page ?? 1;
    const limit = params?.limit || 20;
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.set('userId', params.userId);
    if (params?.itemId) searchParams.set('itemId', params.itemId);
    if (params?.bundleId) searchParams.set('bundleId', params.bundleId);
    if (params?.status) searchParams.set('status', params.status);
    searchParams.set('limit', String(limit));
    searchParams.set('offset', String((page - 1) * limit));

    const response = await apiClient.get<RawPaginatedResponse<unknown>>(
      `/store/admin/purchases?${searchParams}`,
    );
    return normalizePaginatedResponse(response, { page, limit });
  },

  /** GET /store/admin/purchases/:id */
  async getAdminPurchaseById(id: string): Promise<unknown> {
    return apiClient.get(`/store/admin/purchases/${id}`);
  },

  /** GET /store/admin/stats */
  async getStoreStats(): Promise<StoreStats> {
    return apiClient.get<StoreStats>('/store/admin/stats');
  },

  /** GET /store/admin/user/:userId/inventory */
  async getUserInventoryByAdmin(userId: string): Promise<InventoryItem[]> {
    return toArray(
      await apiClient.get<InventoryItem[] | { data: InventoryItem[] }>(
        `/store/admin/user/${userId}/inventory`,
      ),
    );
  },

  /** POST /store/admin/user/:userId/grant-item */
  async grantItemToUser(
    userId: string,
    data: { itemId: string; quantity?: number; reason?: string },
  ): Promise<void> {
    await apiClient.post(`/store/admin/user/${userId}/grant-item`, data);
  },

  /**
   * GET /store/admin/user/:userId/loadout.
   * ponytail: LoadoutItem still describes the old per-slot shape; the endpoint
   * answers `{ inventoryId, slot, itemCode, itemType, rarity, assets, owned }[]`.
   * Correct the type when a caller actually consumes the rows.
   */
  async getUserLoadoutByAdmin(userId: string): Promise<LoadoutItem[]> {
    return toArray(
      await apiClient.get<LoadoutItem[] | { data: LoadoutItem[] }>(
        `/store/admin/user/${userId}/loadout`,
      ),
    );
  },
};

export default storeService;
