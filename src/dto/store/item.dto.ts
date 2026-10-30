import { z } from 'zod';
import { STORE_ITEM_SLOTS } from '@/shared/lib/store-item-types';

/**
 * Mirrors the backend canonical creation-time item types exactly
 * (backend `modules/store/cosmetic-slots.ts` CANONICAL_STORE_ITEM_TYPES,
 * enforced server-side by `CreateItemDto.type` via `@IsIn(ITEM_TYPES)`).
 * `avatar` / `avatar_frame` are legacy read-only aliases and are REJECTED
 * on create — do not add them back here.
 */
export const ITEM_TYPES = [
  'ludo_cover', 'dice', 'chess_piece', 'profile_avatar', 'profile_frame',
  'profile_background', 'profile_card', 'profile_wall_hanging', 'room_theme',
  'room_wallpaper', 'room_mic_skin', 'ludo_board', 'ludo_dice', 'ludo_tokens',
  'domino_board', 'domino_tile_face', 'domino_tile_back',
  'badge', 'consumable', 'gift_item',
] as const;

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export const SCOPES = ['profile', 'room', 'game'] as const;
export const GAME_TYPES = ['ludo', 'domino'] as const;

export const ASSET_TYPES = ['image', 'animated_webp', 'svga', 'lottie', 'rive', 'audio', 'spritesheet', 'svg'] as const;
export const ASSET_SUBTYPES = ['thumb', 'preview', 'full', 'sfx_roll', 'sfx_move', 'sfx_win', 'sfx_land', 'sfx_capture', 'sfx_click', 'sfx_ambient'] as const;
export const ASSET_LANGUAGES = ['en', 'ar', 'all'] as const;
export const ASSET_ROLES = ['primary', 'secondary', 'thumbnail', 'preview', 'full'] as const;

export const AssetSchema = z.object({
  id: z.string().optional(),
  type: z.enum(ASSET_TYPES),
  subType: z.enum(ASSET_SUBTYPES),
  language: z.enum(ASSET_LANGUAGES).optional(),
  role: z.enum(ASSET_ROLES).optional(),
  url: z.string().url(),
  hash: z.string().optional(),
  version: z.number().int().positive().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

export const CreateStoreItemSchema = z.object({
  code: z.string().min(1),
  type: z.string().min(1),
  // Closed vocabulary enforced by the backend (`@IsIn(STORE_ITEM_SLOTS)`).
  // The dashboard mirrors the same list from `store-item-types`.
  slot: z.enum(STORE_ITEM_SLOTS),
  scope: z.enum(SCOPES),
  gameType: z.string().optional(),
  rarity: z.enum(RARITIES),
  title: z.union([z.record(z.string(), z.string()), z.string()]),
  // Backend CreateItemDto.description is an optional localized object or string.
  description: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
  /** Non-negative integer string — mirrors CreateItemDto exactly and preserves
   * numeric(30,0) precision beyond JavaScript's safe-integer range. */
  priceGameCurrency: z.string().regex(/^(0|[1-9][0-9]*)$/),
  isStackable: z.boolean().optional(),
  defaultExpiryHours: z.number().optional(),
  assets: z.array(z.object({
    kind: z.string().min(1),
    purpose: z.string().min(1),
    platform: z.string().optional(),
    url: z.string().min(1),
    version: z.number().int().positive().optional(),
    tags: z.array(z.string()).optional(),
  })).min(1),
  styleConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateStoreItemRequest = z.infer<typeof CreateStoreItemSchema>;

/**
 * Backend UpdateItemDto deliberately excludes `code` (immutable identity) and
 * `styleConfig` (create-only) — omitted here so a PATCH body can never carry
 * either. Every remaining key is optional, matching `@IsOptional()`.
 *
 * `availabilityStartsAt` / `availabilityEndsAt` / `displayPriority` /
 * `isLimitedTime` exist only on UpdateItemDto, so they are edit-only: adding
 * them here and not to CreateStoreItemSchema mirrors the backend exactly.
 *
 * `priceMode` is deliberately NOT exposed. It is guarded by
 * `validatePricingPatch`, which rejects anything but `game_currency`, so it is
 * a service invariant rather than an operator-editable field.
 */
export const UpdateStoreItemSchema = CreateStoreItemSchema.omit({
  code: true,
  styleConfig: true,
}).extend({
  displayPriority: z.number().optional(),
  isLimitedTime: z.boolean().optional(),
  // `.nullable()` so an emptied date input can send `null` and clear the
  // column. Every UpdateItemDto field is `@IsOptional()`, so `null` skips
  // validation and is written straight through; omitting the key would leave
  // the stored value in place instead.
  availabilityStartsAt: z.string().nullable().optional(),
  availabilityEndsAt: z.string().nullable().optional(),
});

export type UpdateStoreItemRequest = z.infer<typeof UpdateStoreItemSchema>;

export const BundleItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type BundleItem = z.infer<typeof BundleItemSchema>;

export const CreateStoreBundleSchema = z.object({
  sku: z.string().min(1),
  // Backend CreateBundleDto.title is `@IsObject()`; a bare string is rejected
  // with 422 "title must be an object", so the schema must not offer the union.
  title: z.record(z.string(), z.string()),
  /** Backend CreateBundleDto requires a positive integer string. */
  priceGameCurrency: z.string().regex(/^[1-9][0-9]*$/),
  isActive: z.boolean().optional(),
  items: z.array(BundleItemSchema).optional(),
});

export type CreateStoreBundleRequest = z.infer<typeof CreateStoreBundleSchema>;

/**
 * UpdateBundleDto does not declare `items`: a PATCH carrying it is accepted and
 * silently stripped by the whitelist pipe. Bundle membership is only writable
 * through `POST /store/admin/bundles/:id/items` and
 * `DELETE /store/admin/bundles/:id/items/:itemId`, so the key is omitted here
 * instead of travelling to the server and vanishing.
 */
export const UpdateStoreBundleSchema = CreateStoreBundleSchema
  .omit({ items: true })
  .partial();

export type UpdateStoreBundleRequest = z.infer<typeof UpdateStoreBundleSchema>;

export const AddAssetsSchema = z.object({
  assets: z.array(z.object({
    type: z.enum(ASSET_TYPES),
    subType: z.enum(ASSET_SUBTYPES),
    language: z.enum(ASSET_LANGUAGES).optional(),
    role: z.enum(ASSET_ROLES).optional(),
    url: z.string().url(),
    hash: z.string().optional(),
    version: z.number().int().positive().optional(),
  })),
});

export type AddAssetsRequest = z.infer<typeof AddAssetsSchema>;
