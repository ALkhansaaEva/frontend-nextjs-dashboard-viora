import apiClient from '@/lib/api/api-client';

export interface GiftCatalogEntry {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  icon: string;
  priceGems: number;
  priceCoins: number;
  isActive: boolean;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGiftRequest {
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  icon?: string;
  priceGems?: number;
  priceCoins?: number;
  isActive?: boolean;
  stock?: number;
}

export interface UpdateGiftRequest {
  titleI18n?: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  icon?: string;
  priceGems?: number;
  priceCoins?: number;
  isActive?: boolean;
  stock?: number;
}

function normalizeArrayResponse<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object') {
    const res = response as Record<string, unknown>;
    if (Array.isArray(res.data)) return res.data as T[];
    if (Array.isArray(res.catalog)) return res.catalog as T[];
    if (Array.isArray(res.items)) return res.items as T[];
    for (const key in res) {
      if (Array.isArray(res[key])) return res[key] as T[];
    }
  }
  return [];
}

function mapGiftItem(item: any): GiftCatalogEntry {
  return {
    id: item.id,
    code: item.slug ?? item.code ?? '',
    titleI18n: typeof item.name === 'string' ? { en: item.name } : (item.titleI18n ?? {}),
    descriptionI18n: typeof item.description === 'string' ? { en: item.description } : (item.descriptionI18n ?? {}),
    icon: item.icon ?? '',
    priceGems: item.priceCurrency === 'gems' ? (item.priceAmount ?? 0) : 0,
    priceCoins: item.priceCurrency === 'gold' ? (item.priceAmount ?? 0) : 0,
    isActive: item.isActive ?? true,
    stock: item.stock ?? 0,
    createdAt: item.createdAt ?? item.created_at ?? '',
    updatedAt: item.updatedAt ?? item.updated_at ?? '',
  };
}

export const giftsService = {
  async getCatalog(): Promise<GiftCatalogEntry[]> {
    const response = await apiClient.get<unknown>('/gifts/admin/catalog');
    const raw = normalizeArrayResponse<any>(response);
    return raw.map(mapGiftItem);
  },

  async getCatalogEntryById(id: string): Promise<GiftCatalogEntry> {
    return apiClient.get<GiftCatalogEntry>(`/gifts/admin/catalog/${id}`);
  },

  async createCatalogEntry(data: CreateGiftRequest): Promise<GiftCatalogEntry> {
    return apiClient.post<GiftCatalogEntry>('/gifts/admin/catalog', data);
  },

  async updateCatalogEntry(id: string, data: UpdateGiftRequest): Promise<GiftCatalogEntry> {
    return apiClient.put<GiftCatalogEntry>(`/gifts/admin/catalog/${id}`, data);
  },

  async deleteCatalogEntry(id: string): Promise<void> {
    await apiClient.delete(`/gifts/admin/catalog/${id}`);
  },

  async updateCatalogEntryStatus(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/gifts/admin/catalog/${id}/status`, { isActive });
  },

  async getPublicCatalog(): Promise<GiftCatalogEntry[]> {
    const response = await apiClient.get<unknown>('/gifts/catalog');
    const raw = normalizeArrayResponse<any>(response);
    return raw.map(mapGiftItem);
  },

  async getPublicCatalogEntryById(id: string): Promise<GiftCatalogEntry> {
    return apiClient.get<GiftCatalogEntry>(`/gifts/catalog/${id}`);
  },

  async sendGift(recipientUserId: string, catalogId: string, message?: string): Promise<void> {
    await apiClient.post('/gifts/send', { recipientUserId, catalogId, message });
  },
};

export default giftsService;
