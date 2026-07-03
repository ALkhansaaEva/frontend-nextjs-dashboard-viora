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
  priceGems: number;
  priceCoins: number;
  isActive: boolean;
  isStackable: boolean;
  defaultExpiryHours: number | null;
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
  iconUrl?: string;
  priceGems?: number;
  priceCoins?: number;
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

interface RawPaginatedResponse<T> {
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

function normalizePaginatedResponse<T>(response: unknown, mapFn?: (item: T) => T): PaginatedResponse<T> {
  const raw = response as RawPaginatedResponse<T>;
  const data = raw.data || [];
  return {
    data: mapFn ? data.map(mapFn) : data,
    total: raw.total || data.length,
    page: raw.page || 1,
    limit: raw.limit || data.length,
    totalPages: raw.totalPages || 1,
  };
}

export const storeService = {
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

    const response = await apiClient.get<StoreItem[] | { data: StoreItem[] }>(url);
    if (Array.isArray(response)) return response;
    return (response as { data: StoreItem[] }).data || [];
  },

  async getBundles(): Promise<StoreBundle[]> {
    const response = await apiClient.get<StoreBundle[] | { data: StoreBundle[] }>('/store/bundles');
    if (Array.isArray(response)) return response;
    return (response as { data: StoreBundle[] }).data || [];
  },

  async purchaseBundle(bundleId: string): Promise<void> {
    await apiClient.post(`/store/purchase/${bundleId}`);
  },

  async purchaseItem(itemId: string): Promise<void> {
    await apiClient.post(`/store/purchase/item/${itemId}`);
  },

  async getInventory(params?: ListParams): Promise<PaginatedResponse<InventoryItem>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      const offset = (params.page - 1) * (params.limit || 20);
      searchParams.set('offset', offset.toString());
    }
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('filter', params.search);

    const query = searchParams.toString();
    const url = query ? `/store/inventory?${query}` : '/store/inventory';

    const response = await apiClient.get<RawPaginatedResponse<InventoryItem>>(url);
    return normalizePaginatedResponse(response);
  },

  async equipItem(inventoryId: string): Promise<void> {
    await apiClient.post(`/store/equip/${inventoryId}`);
  },

  async unequipItem(slot: string): Promise<void> {
    await apiClient.delete(`/store/equip/${slot}`);
  },

  async getLoadout(): Promise<LoadoutItem[]> {
    const response = await apiClient.get<LoadoutItem[] | { data: LoadoutItem[] }>('/store/loadout/me');
    if (Array.isArray(response)) return response;
    return (response as { data: LoadoutItem[] }).data || [];
  },

  async getReceivedGifts(): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>('/store/gifts/received');
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async acceptGift(giftId: string): Promise<void> {
    await apiClient.post(`/store/gifts/${giftId}/accept`);
  },

  async declineGift(giftId: string): Promise<void> {
    await apiClient.post(`/store/gifts/${giftId}/decline`);
  },

async getSentGifts(): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>('/store/gifts/sent');
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async createItem(data: CreateStoreItemRequest): Promise<StoreItem> {
    const validated = CreateStoreItemSchema.parse(data);
    return apiClient.post<StoreItem>('/store/items', validated);
  },

  async createBundle(data: CreateStoreBundleRequest): Promise<StoreBundle> {
    const validated = CreateStoreBundleSchema.parse(data);
    return apiClient.post<StoreBundle>('/store/bundles', validated);
  },

  async updateItem(id: string, data: Partial<CreateStoreItemRequest>): Promise<StoreItem> {
    const validated = data.title ? UpdateStoreItemSchema.parse(data) : data;
    return apiClient.patch<StoreItem>(`/store/admin/items/${id}`, validated);
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${id}`);
  },

  async updateBundle(id: string, data: Partial<CreateStoreBundleRequest>): Promise<StoreBundle> {
    const validated = data.title ? UpdateStoreBundleSchema.parse(data) : data;
    return apiClient.patch<StoreBundle>(`/store/admin/bundles/${id}`, validated);
  },

  async deleteBundle(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/bundles/${id}`);
  },

  async getItemById(id: string): Promise<StoreItem> {
    return apiClient.get<StoreItem>(`/store/items/${id}`);
  },

  async getBundleById(bundleId: string): Promise<StoreBundle> {
    return apiClient.get<StoreBundle>(`/store/bundles/${bundleId}`);
  },

  async addBulkAssetsToItem(itemId: string, assets: Array<{
    kind: string;
    purpose: string;
    platform: string;
    url: string;
    hash?: string;
    version?: number;
    sizeBytes?: number;
  }>): Promise<{ success: boolean; message: string; assets: Asset[] }> {
    return apiClient.post<{ success: boolean; message: string; assets: Asset[] }>(`/store/admin/items/${itemId}/assets/bulk`, { assets });
  },

  async getPurchaseHistory(): Promise<unknown[]> {
    const response = await apiClient.get<unknown[] | { data: unknown[] }>('/store/purchases');
    if (Array.isArray(response)) return response;
    return (response as { data: unknown[] }).data || [];
  },

  async getAdminItems(params?: ListParams): Promise<PaginatedResponse<StoreItem>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('offset', ((params.page - 1) * (params.limit || 20)).toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/store/items?${query}` : '/store/items';
    const response = await apiClient.get<RawPaginatedResponse<StoreItem>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminItemById(id: string): Promise<StoreItem> {
    return apiClient.get<StoreItem>(`/store/items/${id}`);
  },

  async updateAdminItem(id: string, data: Partial<CreateStoreItemRequest>): Promise<StoreItem> {
    return apiClient.patch<StoreItem>(`/store/admin/items/${id}`, data);
  },

  async deleteAdminItem(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${id}`);
  },

  async addAssetToItem(itemId: string, asset: Asset): Promise<StoreItem> {
    return apiClient.post<StoreItem>(`/store/admin/items/${itemId}/assets`, asset);
  },

  async deleteAssetFromItem(itemId: string, assetId: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${itemId}/assets/${assetId}`);
  },

  async getAdminBundles(params?: ListParams): Promise<PaginatedResponse<StoreBundle>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('offset', ((params.page - 1) * (params.limit || 20)).toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/store/bundles?${query}` : '/store/bundles';
    const response = await apiClient.get<RawPaginatedResponse<StoreBundle>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminBundleById(id: string): Promise<StoreBundle> {
    return apiClient.get<StoreBundle>(`/store/bundles/${id}`);
  },

  async updateAdminBundle(id: string, data: Partial<CreateStoreBundleRequest>): Promise<StoreBundle> {
    return apiClient.patch<StoreBundle>(`/store/admin/bundles/${id}`, data);
  },

  async deleteAdminBundle(id: string): Promise<void> {
    await apiClient.delete(`/store/admin/bundles/${id}`);
  },

  async addItemToBundle(bundleId: string, item: { itemId: string; quantity: number }): Promise<StoreBundle> {
    return apiClient.post<StoreBundle>(`/store/admin/bundles/${bundleId}/items`, item);
  },

  async removeItemFromBundle(bundleId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/store/admin/bundles/${bundleId}/items/${itemId}`);
  },

  async getAdminPurchases(params?: ListParams): Promise<PaginatedResponse<unknown>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('offset', ((params.page - 1) * (params.limit || 20)).toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    const url = query ? `/store/purchases?${query}` : '/store/purchases';
    const response = await apiClient.get<RawPaginatedResponse<unknown>>(url);
    return normalizePaginatedResponse(response);
  },

  async getAdminPurchaseById(id: string): Promise<unknown> {
    return apiClient.get(`/store/purchases/${id}`);
  },

  async getStoreStats(): Promise<{ totalItems: number; totalBundles: number; totalPurchases: number; revenue: Record<string, number> }> {
    return apiClient.get('/store/stats');
  },

  async getUserInventoryByAdmin(userId: string): Promise<InventoryItem[]> {
    const response = await apiClient.get<InventoryItem[] | { data: InventoryItem[] }>(`/store/user/${userId}/inventory`);
    if (Array.isArray(response)) return response;
    return (response as { data: InventoryItem[] }).data || [];
  },

  async addItemAssets(itemId: string, assets: { url: string; type: string; metadata?: Record<string, unknown> }[]): Promise<void> {
    await apiClient.post(`/store/admin/items/${itemId}/assets`, { assets });
  },

  async bulkAddItemAssets(itemId: string, assets: { url: string; type: string; metadata?: Record<string, unknown> }[]): Promise<void> {
    await apiClient.post(`/store/admin/items/${itemId}/assets/bulk`, { assets });
  },

  async updateItemAssets(itemId: string, assets: { id: string; url?: string; type?: string; metadata?: Record<string, unknown> }[]): Promise<void> {
    await apiClient.patch(`/store/admin/items/${itemId}/assets`, { assets });
  },

  async deleteItemAsset(itemId: string, assetId: string): Promise<void> {
    await apiClient.delete(`/store/admin/items/${itemId}/assets/${assetId}`);
  },

  async grantItemToUser(userId: string, data: { itemId: string; quantity: number; reason?: string }): Promise<void> {
    await apiClient.post(`/store/user/${userId}/grant-item`, data);
  },

  async getUserLoadoutByAdmin(userId: string): Promise<LoadoutItem[]> {
    const response = await apiClient.get<LoadoutItem[] | { data: LoadoutItem[] }>(`/store/user/${userId}/loadout`);
    if (Array.isArray(response)) return response;
    return (response as { data: LoadoutItem[] }).data || [];
  },
};

export default storeService;