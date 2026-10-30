import apiClient from '@/lib/api/api-client';
import { mediaPublicUrl } from '@/shared/lib/media-url';

export type GiftCatalogContext = 'room' | 'match';

/** One page of `GET /gifts/admin/catalog` (PaginatedGiftCatalogResponseDto). */
export interface GiftCatalogPage {
  items: GiftCatalogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


export interface GiftCatalogEntry {
  id: string;
  contextType: GiftCatalogContext;
  code: string;
  /**
   * Backend `GiftCatalogItem.name` (single string — there is no i18n column).
   * Projected into `{ en }` only because the shared `GiftCard`/`GiftTable`
   * components read `titleI18n.en`; it never carries a second locale.
   */
  titleI18n: { en: string };
  /** Same single-locale projection of the backend `description` column. */
  descriptionI18n?: { en: string };
  /** Backend `iconMediaId` — a media_files uuid, or a legacy absolute URL. */
  iconMediaId?: string;
  /** Renderable preview URL. Empty when `iconMediaId` needs resolving first. */
  icon: string;
  /** Backend `previewMediaId` — media_files uuid, optional on both DTOs. */
  previewMediaId?: string;
  /**
   * Backend `animationMediaId` — media_files uuid. Pairs with `visualType`:
   * an animated/lottie/video gift is an animation asset, not a still image.
   */
  animationMediaId?: string;
  /** Backend `soundMediaId` — media_files uuid. */
  soundMediaId?: string;
  /** Backend `stickerMediaId` — required at SEND time for match gifts only. */
  stickerMediaId?: string;
  /** Backend `metadata` — free-form jsonb, writable and nullable. */
  metadata?: Record<string, unknown>;
  allowedGameTypes?: Array<'ludo' | 'domino'>;

  /** Backend `GiftCatalogItem.priceGameCurrency` — numeric(30,0) string,
   * `null` when unpriced. There is no `priceCurrency`/`priceAmount` split on
   * the backend (GiftCurrency enum has exactly one member: GAME_CURRENCY). */
  priceGameCurrency: string | null;
  isActive: boolean;
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
  /** `CreateGiftCatalogItemDto.slug` — unique, required. */
  code: string;
  contextType: GiftCatalogContext;
  /** `CreateGiftCatalogItemDto.name` — required single string. */
  name: string;
  /** `CreateGiftCatalogItemDto.description` — optional single string. */
  description?: string;
/** `iconMediaId` — media_files uuid, or a legacy absolute URL. */
  iconMediaId?: string | null;
  previewMediaId?: string | null;
  animationMediaId?: string | null;
  soundMediaId?: string | null;
  stickerMediaId?: string | null;
  allowedGameTypes?: Array<'ludo' | 'domino'>;

  /** Positive integer string — backend `CreateGiftCatalogItemDto.priceGameCurrency`, required. */
  priceGameCurrency: string;
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
  startsAt?: string | null;
  endsAt?: string | null;
  countryCode?: string | null;
  roomId?: string | null;
  vipLevelRequired?: number;
  eventId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateGiftRequest {
  contextType?: GiftCatalogContext;
  name?: string;
  description?: string | null;
  iconMediaId?: string | null;
  previewMediaId?: string | null;
  animationMediaId?: string | null;
  soundMediaId?: string | null;
  stickerMediaId?: string | null;
  allowedGameTypes?: Array<'ludo' | 'domino'>;

  /** Positive integer string — backend `UpdateGiftCatalogItemDto.priceGameCurrency`. */
  priceGameCurrency?: string;
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
  startsAt?: string | null;
  endsAt?: string | null;
  countryCode?: string | null;
  roomId?: string | null;
  vipLevelRequired?: number | null;
  eventId?: string | null;
  metadata?: Record<string, unknown> | null;
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

function isDisplayUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/') || value.startsWith('//');
}

function mapGiftItem(item: Record<string, unknown>): GiftCatalogEntry {
  const name = typeof item.name === 'string' ? item.name : '';
  const description = typeof item.description === 'string' ? item.description : '';
  const iconMediaId = typeof item.iconMediaId === 'string' ? item.iconMediaId : '';
  const optionalString = (key: string) => typeof item[key] === 'string' ? item[key] as string : undefined;
  const previewMediaId = optionalString('previewMediaId');
  const animationMediaId = optionalString('animationMediaId');
  const soundMediaId = optionalString('soundMediaId');
  // `metadata` is jsonb: the backend always returns an object or null.
  const metadata =
    item.metadata && typeof item.metadata === 'object' && !Array.isArray(item.metadata)
      ? (item.metadata as Record<string, unknown>)
      : undefined;
  // Point columns are int on the backend, but coerce numeric strings too —
  // defaulting them to 0 would silently overwrite a gift's real points on
  // the next edit.
  const numberOr = (key: string, fallback = 0): number => {
    const value = item[key];
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
  };
  const booleanOr = (key: string, fallback = false) => typeof item[key] === 'boolean' ? item[key] as boolean : fallback;

  if (item.contextType !== 'room' && item.contextType !== 'match') {
    throw new Error(`Unsupported gift catalog context: ${String(item.contextType)}`);
  }
  const allowedGameTypes = Array.isArray(item.allowedGameTypes)
    ? item.allowedGameTypes.filter(
        (value): value is 'ludo' | 'domino' => value === 'ludo' || value === 'domino',
      )
    : [];

  return {
    id: String(item.id ?? ''),
    contextType: item.contextType,
    code: optionalString('slug') ?? optionalString('code') ?? '',
    titleI18n: { en: name },
    ...(description ? { descriptionI18n: { en: description } } : {}),
    ...(iconMediaId ? { iconMediaId } : {}),
    // The backend nests the resolved media as `iconMedia`
    // (`{ id, url, mimeType }`) alongside the legacy `iconMediaId`. Resolving
    // from the id alone produced `''` for every gift, because an id is not a
    // URL; the nested object is the displayable representation.
    icon: mediaPublicUrl(
      (item.iconMedia as { url?: string | null } | null | undefined) ??
        (isDisplayUrl(iconMediaId) ? iconMediaId : null),
    ),
    ...(previewMediaId ? { previewMediaId } : {}),
    ...(animationMediaId ? { animationMediaId } : {}),
    ...(soundMediaId ? { soundMediaId } : {}),
    stickerMediaId: optionalString('stickerMediaId'),
    ...(metadata ? { metadata } : {}),
    allowedGameTypes,

    priceGameCurrency: item.priceGameCurrency != null ? String(item.priceGameCurrency) : null,
    isActive: booleanOr('isActive', true),
    createdAt: optionalString('createdAt') ?? optionalString('created_at') ?? '',
    updatedAt: optionalString('updatedAt') ?? optionalString('updated_at') ?? '',
    visualType: optionalString('visualType') ?? 'static',
    category: optionalString('category') ?? 'basic',
    rarity: optionalString('rarity') ?? 'common',
    popularityPoints: numberOr('popularityPoints'),
    wealthPoints: numberOr('wealthPoints'),
    charmPoints: numberOr('charmPoints'),
    reputationPoints: numberOr('reputationPoints'),
    roomContributionPoints: numberOr('roomContributionPoints'),
    roomExperiencePoints: numberOr('roomExperiencePoints'),
    senderExperiencePoints: numberOr('senderExperiencePoints'),
    receiverExperiencePoints: numberOr('receiverExperiencePoints'),
    broadcastLevel: optionalString('broadcastLevel') ?? 'none',
    displayPriority: numberOr('displayPriority'),
    isLimitedTime: booleanOr('isLimitedTime'),
    startsAt: optionalString('startsAt'),
    endsAt: optionalString('endsAt'),
    countryCode: optionalString('countryCode'),
    roomId: optionalString('roomId'),
    // Same int-column coercion as the point fields: a numeric string must not
    // read back as "unset" and get written back as 0 on the next edit.
    vipLevelRequired: numberOr('vipLevelRequired'),
    eventId: optionalString('eventId'),
  };
}

function toBackendCreateDto(data: CreateGiftRequest) {
  return {
    slug: data.code,
    contextType: data.contextType,
    name: data.name,
    description: data.description || undefined,
    iconMediaId: data.iconMediaId || undefined,
    previewMediaId: data.previewMediaId || undefined,
    animationMediaId: data.animationMediaId || undefined,
    soundMediaId: data.soundMediaId || undefined,
    stickerMediaId: data.stickerMediaId || undefined,
    metadata: data.metadata ?? undefined,
    allowedGameTypes: data.allowedGameTypes,
    category: data.category,
    rarity: data.rarity,
    priceGameCurrency: data.priceGameCurrency,
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
  if (data.name !== undefined) dto.name = data.name;
  // A cleared field is transmitted as null so the column is actually cleared;
  // omitting the key leaves the stored value untouched.
  if (data.description !== undefined) dto.description = data.description || null;
  if (data.iconMediaId !== undefined) dto.iconMediaId = data.iconMediaId || null;
  if (data.previewMediaId !== undefined) dto.previewMediaId = data.previewMediaId || null;
  if (data.animationMediaId !== undefined) dto.animationMediaId = data.animationMediaId || null;
  if (data.soundMediaId !== undefined) dto.soundMediaId = data.soundMediaId || null;
  if (data.stickerMediaId !== undefined) dto.stickerMediaId = data.stickerMediaId || null;
  if (data.metadata !== undefined) dto.metadata = data.metadata ?? null;

  if (data.allowedGameTypes !== undefined) dto.allowedGameTypes = data.allowedGameTypes;
  if (data.contextType !== undefined) dto.contextType = data.contextType;
  if (data.category) dto.category = data.category;
  if (data.rarity) dto.rarity = data.rarity;
  if (data.visualType) dto.visualType = data.visualType;
  if (data.broadcastLevel) dto.broadcastLevel = data.broadcastLevel;

  if (data.priceGameCurrency !== undefined) dto.priceGameCurrency = data.priceGameCurrency;

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
  return dto;
}

export const giftsService = {
  /**
   * GET /gifts/admin/catalog — paginated by the backend
   * (`take` 1..100, default 50; `skip`, default 0) and answered as
   * `{ items, total, page, pageSize, totalPages }`.
   */
  async getCatalog(params?: { take?: number; skip?: number; contextType?: GiftCatalogContext; category?: string; rarity?: string }): Promise<GiftCatalogPage> {
    const take = params?.take ?? 50;
    const skip = params?.skip ?? 0;
    const response = await apiClient.get<unknown>('/gifts/admin/catalog', {
      params: { take, skip, ...(params?.contextType ? { contextType: params.contextType } : {}), ...(params?.category ? { category: params.category } : {}), ...(params?.rarity ? { rarity: params.rarity } : {}) },
    });
    const envelope = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>;
    const items = normalizeArrayResponse<Record<string, unknown>>(response);
    const numberOr = (key: string, fallback: number) =>
      typeof envelope[key] === 'number' && Number.isFinite(envelope[key] as number)
        ? (envelope[key] as number)
        : fallback;
    return {
      items: items.map(mapGiftItem),
      total: numberOr('total', items.length),
      page: numberOr('page', Math.floor(skip / take) + 1),
      pageSize: numberOr('pageSize', take),
      totalPages: numberOr('totalPages', items.length === 0 ? 0 : 1),
    };
  },


  async getCatalogEntryById(id: string): Promise<GiftCatalogEntry> {
    const response = await apiClient.get<Record<string, unknown>>(`/gifts/admin/catalog/${id}`);
    return mapGiftItem(response);
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

};

export default giftsService;
