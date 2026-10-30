import type {
  CreateGiftRequest,
  GiftCatalogContext,
  UpdateGiftRequest,
} from '@/services/gifts.service';

export type GiftGameType = 'ludo' | 'domino';

export interface GiftCatalogFormData {
  contextType: GiftCatalogContext;
  /** Backend `slug`. */
  code: string;
  /** Backend `name` — the DTO carries a single name string, not a locale map. */
  name: string;
  description: string;
  /** Backend `iconMediaId` — a media_files uuid, or a legacy absolute URL. */
  iconMediaId: string;
  /** Backend `previewMediaId` — media_files uuid. */
  previewMediaId: string;
  /**
   * Backend `animationMediaId` — media_files uuid. This is the animated
   * asset a `visualType` of animated/lottie/video/combo renders from, and it
   * is deliberately NOT the still `iconMediaId`.
   */
  animationMediaId: string;
  /** Backend `soundMediaId` — media_files uuid. */
  soundMediaId: string;
  /**
   * Backend `stickerMediaId`. Required at SEND time for match gifts only
   * (`GiftAvailabilityService.validateForSend`); the catalog persists it for
   * either context, so the form never blocks a save on its absence.
   */
  stickerMediaId: string;
  /** Raw `metadata` jsonb as typed in the form; parsed by `buildWritableFields`. */
  metadataJson: string;
  allowedGameTypes: GiftGameType[];
  priceGameCurrency: string;
  category: string;
  rarity: string;
  visualType: string;
  popularityPoints: number;
  wealthPoints: number;
  charmPoints: number;
  reputationPoints: number;
  roomContributionPoints: number;
  roomExperiencePoints: number;
  senderExperiencePoints: number;
  receiverExperiencePoints: number;
  broadcastLevel: string;
  displayPriority: number;
  isActive: boolean;
  isLimitedTime: boolean;
  startsAt: string;
  endsAt: string;
  countryCode: string;
  roomId: string;
  vipLevelRequired: number;
  eventId: string;
}

/** `contextType` is the DTO's own enum; no editorial copy layered on top. */
export const GIFT_CONTEXT_PRESENTATION = {
  room: { label: 'Room gift' },
  match: { label: 'Match gift' },
} as const satisfies Record<GiftCatalogContext, Record<string, string>>;

/**
 * Every field the DTO accepts, always present and always a plain value. An
 * empty string means "clear it" — the service turns that into null on update
 * so an emptied field is actually removed from the stored row.
 */
type WritableFields = Omit<CreateGiftRequest, 'code' | 'roomId'> & {
  roomId?: string | null;
  previewMediaId: string | null;
  animationMediaId: string | null;
  soundMediaId: string | null;
  stickerMediaId: string | null;
  metadata?: Record<string, unknown> | null;
  description: string;
  iconMediaId: string | null;
  countryCode: string | null;
  eventId: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

/**
 * Optional string fields are sent as `null` when blank. Sending `""` makes
 * class-validator's `@IsUUID()` / `@IsDate()` reject the whole request — a
 * gift with no icon (the common case) could never be created or saved.
 */
function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Parses the form's `metadata` text. Returns `null` for an empty box so an
 * update clears the column, and `undefined` when the text is not a JSON
 * object — `giftCatalogFormError` reports that before any request is built,
 * so this never reaches the wire as invalid JSON.
 */
function readMetadata(form: GiftCatalogFormData): Record<string, unknown> | null | undefined {
  const raw = form.metadataJson.trim();
  // An empty box clears the column on update instead of writing "".
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Fields are sent exactly as the operator left them. The backend has no
 * per-context normalisation to mirror: a match gift persists non-zero point
 * fields, a non-`none` `broadcastLevel`, `roomId` and `allowedGameTypes`
 * (verified against `PATCH /gifts/admin/catalog/:id`), and `contextType` is
 * itself mutable without any server-side cleanup. Forcing zeros here would
 * silently destroy stored data on every save.
 */
function buildWritableFields(form: GiftCatalogFormData): WritableFields {
  return {
    contextType: form.contextType,
    name: form.name,
    description: form.description,
    iconMediaId: blankToNull(form.iconMediaId),
    previewMediaId: blankToNull(form.previewMediaId),
    animationMediaId: blankToNull(form.animationMediaId),
    soundMediaId: blankToNull(form.soundMediaId),
    stickerMediaId: blankToNull(form.stickerMediaId),
    metadata: readMetadata(form) ?? null,
    allowedGameTypes: form.allowedGameTypes,
    priceGameCurrency: form.priceGameCurrency,
    category: form.category,
    rarity: form.rarity,
    visualType: form.visualType,
    popularityPoints: form.popularityPoints,
    wealthPoints: form.wealthPoints,
    charmPoints: form.charmPoints,
    reputationPoints: form.reputationPoints,
    roomContributionPoints: form.roomContributionPoints,
    roomExperiencePoints: form.roomExperiencePoints,
    senderExperiencePoints: form.senderExperiencePoints,
    receiverExperiencePoints: form.receiverExperiencePoints,
    broadcastLevel: form.broadcastLevel,
    displayPriority: form.displayPriority,
    isActive: form.isActive,
    isLimitedTime: form.isLimitedTime,
    startsAt: blankToNull(form.startsAt),
    endsAt: blankToNull(form.endsAt),
    countryCode: blankToNull(form.countryCode),
    roomId: blankToNull(form.roomId),
    vipLevelRequired: form.vipLevelRequired,
    eventId: blankToNull(form.eventId),
  };
}

/**
 * The `CreateGiftCatalogItemDto` / `UpdateGiftCatalogItemDto` requirements the
 * form cannot express declaratively. Returns the reason to show the operator,
 * or `null` when the form is valid — no throwing, so an invalid form cannot
 * escape as an unhandled event error.
 */
export function giftCatalogFormError(form: GiftCatalogFormData): string | null {
  if (!form.code.trim()) return 'Gift slug is required';
  if (!form.name.trim()) return 'Gift name is required';
  if (!/^[1-9][0-9]*$/.test(form.priceGameCurrency)) {
    return 'Gift price must be a positive integer GAME_CURRENCY value';
  }
  const raw = form.metadataJson.trim();
  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return 'Metadata must be a JSON object';
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return 'Metadata must be a JSON object';
    }
  }
  return null;
}

export function buildGiftCatalogCreateRequest(
  form: GiftCatalogFormData,
): CreateGiftRequest {
  return { code: form.code.trim(), ...buildWritableFields(form) };
}

export function buildGiftCatalogUpdateRequest(
  form: GiftCatalogFormData,
): UpdateGiftRequest {
  return buildWritableFields(form);
}