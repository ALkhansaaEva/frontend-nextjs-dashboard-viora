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
  visualType?: string;
  category?: string;
  rarity?: string;
  popularityPoints?: number;
  wealthPoints?: number;
  charmPoints?: number;
  reputationPoints?: number;
  roomContributionPoints?: number;
  roomExperiencePoints?: number;
  senderExperiencePoints?: number;
  receiverExperiencePoints?: number;
  broadcastLevel?: string;
  displayPriority?: number;
  isLimitedTime?: boolean;
  startsAt?: string;
  endsAt?: string;
  countryCode?: string;
  roomId?: string;
  vipLevelRequired?: number;
  eventId?: string;
}

export interface CreateGiftRequest {
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  icon?: string;
  priceGems?: number;
  priceCoins?: number;
  category: string;
  rarity: string;
  visualType?: string;
  popularityPoints?: number;
  wealthPoints?: number;
  charmPoints?: number;
  reputationPoints?: number;
  roomContributionPoints?: number;
  roomExperiencePoints?: number;
  senderExperiencePoints?: number;
  receiverExperiencePoints?: number;
  broadcastLevel?: string;
  displayPriority?: number;
  isActive?: boolean;
  isLimitedTime?: boolean;
  startsAt?: string;
  endsAt?: string;
  countryCode?: string;
  roomId?: string;
  vipLevelRequired?: number;
  eventId?: string;
  stock?: number;
}

export interface UpdateGiftRequest {
  titleI18n?: Record<string, string>;
  descriptionI18n?: Record<string, string>;
  icon?: string;
  priceGems?: number;
  priceCoins?: number;
  category?: string;
  rarity?: string;
  visualType?: string;
  popularityPoints?: number;
  wealthPoints?: number;
  charmPoints?: number;
  reputationPoints?: number;
  roomContributionPoints?: number;
  roomExperiencePoints?: number;
  senderExperiencePoints?: number;
  receiverExperiencePoints?: number;
  broadcastLevel?: string;
  displayPriority?: number;
  isActive?: boolean;
  isLimitedTime?: boolean;
  startsAt?: string;
  endsAt?: string;
  countryCode?: string;
  roomId?: string;
  vipLevelRequired?: number;
  eventId?: string;
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
  const titleI18n = typeof item.name === 'string' ? { en: item.name } : (item.titleI18n ?? {});
  const descriptionI18n = typeof item.description === 'string'
    ? { en: item.description }
    : (item.descriptionI18n ?? {});
  const hasDesc = Object.keys(descriptionI18n).length > 0;

  return {
    id: item.id,
    code: item.slug ?? item.code ?? '',
    titleI18n,
    ...(hasDesc ? { descriptionI18n } : {}),
    icon: item.icon ?? item.iconMediaId ?? '',
    priceGems: item.priceCurrency === 'gems' ? (item.priceAmount ?? 0) : 0,
    priceCoins: item.priceCurrency === 'gold' ? (item.priceAmount ?? 0) : 0,
    isActive: item.isActive ?? true,
    stock: item.stock ?? 0,
    createdAt: item.createdAt ?? item.created_at ?? '',
    updatedAt: item.updatedAt ?? item.updated_at ?? '',
    visualType: item.visualType ?? 'static',
    category: item.category ?? 'basic',
    rarity: item.rarity ?? 'common',
    popularityPoints: item.popularityPoints ?? 0,
    wealthPoints: item.wealthPoints ?? 0,
    charmPoints: item.charmPoints ?? 0,
    reputationPoints: item.reputationPoints ?? 0,
    roomContributionPoints: item.roomContributionPoints ?? 0,
    roomExperiencePoints: item.roomExperiencePoints ?? 0,
    senderExperiencePoints: item.senderExperiencePoints ?? 0,
    receiverExperiencePoints: item.receiverExperiencePoints ?? 0,
    broadcastLevel: item.broadcastLevel ?? 'none',
    displayPriority: item.displayPriority ?? 0,
    isLimitedTime: item.isLimitedTime ?? false,
    startsAt: item.startsAt ?? undefined,
    endsAt: item.endsAt ?? undefined,
    countryCode: item.countryCode ?? undefined,
    roomId: item.roomId ?? undefined,
    vipLevelRequired: item.vipLevelRequired ?? undefined,
    eventId: item.eventId ?? undefined,
  };
}

function pickI18nValue(i18n: Record<string, string> | undefined): string | undefined {
  if (!i18n) return undefined;
  return i18n.en || Object.values(i18n)[0];
}

function toBackendCreateDto(data: CreateGiftRequest) {
  const name = pickI18nValue(data.titleI18n) ?? data.code;
  const description = pickI18nValue(data.descriptionI18n);
  const priceGems = data.priceGems ?? 0;
  const priceCoins = data.priceCoins ?? 0;
  const priceCurrency = priceGems > 0 ? 'gems' : 'gold';
  const priceAmount = priceCurrency === 'gems' ? priceGems : (priceCoins > 0 ? priceCoins : 1);

  return {
    slug: data.code,
    name,
    description: description || undefined,
    iconMediaId: data.icon || undefined,
    category: data.category,
    rarity: data.rarity,
    priceCurrency,
    priceAmount,
    visualType: data.visualType || undefined,
    popularityPoints: data.popularityPoints,
    wealthPoints: data.wealthPoints,
    charmPoints: data.charmPoints,
    reputationPoints: data.reputationPoints,
    roomContributionPoints: data.roomContributionPoints,
    roomExperiencePoints: data.roomExperiencePoints,
    senderExperiencePoints: data.senderExperiencePoints,
    receiverExperiencePoints: data.receiverExperiencePoints,
    broadcastLevel: data.broadcastLevel || undefined,
    displayPriority: data.displayPriority,
    isActive: data.isActive ?? true,
    isLimitedTime: data.isLimitedTime,
    startsAt: data.startsAt || undefined,
    endsAt: data.endsAt || undefined,
    countryCode: data.countryCode || undefined,
    roomId: data.roomId || undefined,
    vipLevelRequired: data.vipLevelRequired,
    eventId: data.eventId || undefined,
  };
}

function toBackendUpdateDto(data: UpdateGiftRequest) {
  const dto: Record<string, unknown> = {};
  const name = pickI18nValue(data.titleI18n);
  if (name) dto.name = name;
  const description = pickI18nValue(data.descriptionI18n);
  if (description !== undefined) dto.description = description;
  if (data.icon !== undefined) dto.iconMediaId = data.icon || null;
  if (data.category) dto.category = data.category;
  if (data.rarity) dto.rarity = data.rarity;
  if (data.visualType) dto.visualType = data.visualType;
  if (data.broadcastLevel) dto.broadcastLevel = data.broadcastLevel;

  const priceGems = data.priceGems ?? 0;
  const priceCoins = data.priceCoins ?? 0;
  if (priceGems > 0) { dto.priceCurrency = 'gems'; dto.priceAmount = priceGems; }
  else if (priceCoins > 0) { dto.priceCurrency = 'gold'; dto.priceAmount = priceCoins; }

  const intFields: (keyof UpdateGiftRequest)[] = [
    'popularityPoints', 'wealthPoints', 'charmPoints', 'reputationPoints',
    'roomContributionPoints', 'roomExperiencePoints', 'senderExperiencePoints', 'receiverExperiencePoints',
    'displayPriority', 'vipLevelRequired',
  ];
  for (const f of intFields) {
    if (data[f] !== undefined) dto[f] = data[f];
  }
  if (data.isActive !== undefined) dto.isActive = data.isActive;
  if (data.isLimitedTime !== undefined) dto.isLimitedTime = data.isLimitedTime;
  if (data.startsAt !== undefined) dto.startsAt = data.startsAt || null;
  if (data.endsAt !== undefined) dto.endsAt = data.endsAt || null;
  if (data.countryCode !== undefined) dto.countryCode = data.countryCode || null;
  if (data.roomId !== undefined) dto.roomId = data.roomId || null;
  if (data.eventId !== undefined) dto.eventId = data.eventId || null;
  if (data.stock !== undefined) dto.stock = data.stock;
  return dto;
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
    const dto = toBackendCreateDto(data);
    return apiClient.post<GiftCatalogEntry>('/gifts/admin/catalog', dto);
  },

  async updateCatalogEntry(id: string, data: UpdateGiftRequest): Promise<GiftCatalogEntry> {
    const dto = toBackendUpdateDto(data);
    return apiClient.patch<GiftCatalogEntry>(`/gifts/admin/catalog/${id}`, dto);
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
