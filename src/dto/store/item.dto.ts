import { z } from 'zod';

export const ITEM_TYPES = [
  'ludo_cover', 'dice', 'chess_piece', 'room_theme', 'room_wallpaper',
  'room_mic_skin', 'domino_board', 'domino_tile_face', 'domino_tile_back',
  'avatar_frame', 'profile_background', 'profile_frame', 'profile_avatar',
  'ludo_board', 'ludo_dice', 'ludo_tokens', 'badge', 'avatar'
] as const;

export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export const SCOPES = ['profile', 'room', 'game'] as const;
export const GAME_TYPES = ['ludo', 'domino'] as const;

export const ASSET_TYPES = ['image', 'animated_webp', 'lottie', 'rive', 'audio', 'spritesheet', 'svg'] as const;
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
  slot: z.string().min(1),
  scope: z.enum(SCOPES),
  gameType: z.string().optional(),
  rarity: z.enum(RARITIES),
  title: z.union([z.record(z.string(), z.string()), z.string()]),
  // description: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
  priceGems: z.number().optional(),
  priceCoins: z.number().optional(),
  isStackable: z.boolean().optional(),
  defaultExpiryHours: z.number().optional(),
  assets: z.any().optional(),
  styleConfig: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type CreateStoreItemRequest = z.infer<typeof CreateStoreItemSchema>;

export const UpdateStoreItemSchema = CreateStoreItemSchema.partial();

export type UpdateStoreItemRequest = z.infer<typeof UpdateStoreItemSchema>;

export const BundleItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type BundleItem = z.infer<typeof BundleItemSchema>;

export const CreateStoreBundleSchema = z.object({
  sku: z.string().min(1),
  title: z.union([z.record(z.string(), z.string()), z.string()]),
  // description: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
  priceGems: z.number().optional(),
  priceCoins: z.number().optional(),
  isActive: z.boolean().optional(),
  items: z.array(BundleItemSchema).optional(),
});

export type CreateStoreBundleRequest = z.infer<typeof CreateStoreBundleSchema>;

export const UpdateStoreBundleSchema = CreateStoreBundleSchema.partial();

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