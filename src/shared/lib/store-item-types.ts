/**
 * Store item type/slot display names — ONE source of truth.
 *
 * These maps used to be copy-pasted into five files (store page, card, table,
 * detail content, create form), so a label fix had to be made five times and a
 * drift was silently possible. Key set mirrors the backend canonical list:
 *   backend `modules/store/cosmetic-slots.ts`
 *     - `CANONICAL_STORE_ITEM_TYPES` (creation-time `type`, enforced by
 *       `CreateItemDto.type` via `@IsIn`)
 *     - `COSMETIC_SLOTS` (the `slot` values)
 * and the frontend mirror `src/dto/store/item.dto.ts` `ITEM_TYPES`.
 *
 * `type` and `slot` share the map because the backend draws both from the same
 * cosmetic-slot vocabulary.
 */
export const STORE_ITEM_TYPE_LABELS: Readonly<Record<string, string>> = {
  ludo_cover: 'Ludo Cover',
  dice: 'Dice',
  chess_piece: 'Chess Piece',
  room_theme: 'Room Theme',
  room_wallpaper: 'Room Wallpaper',
  room_mic_skin: 'Mic Skin',
  domino_board: 'Domino Board',
  domino_tile_face: 'Tile Face',
  domino_tile_back: 'Tile Back',
  profile_avatar: 'Profile Avatar',
  profile_frame: 'Profile Frame',
  profile_background: 'Profile BG',
  profile_card: 'Profile Card',
  profile_wall_hanging: 'Wall Hanging',
  ludo_board: 'Ludo Board',
  ludo_dice: 'Ludo Dice',
  ludo_tokens: 'Ludo Tokens',
  badge: 'Badge',
  consumable: 'Consumable',
  gift_item: 'Gift Item',
};

/**
 * Human label for a store item `type` or `slot`, falling back to the raw value
 * so an unmapped (or legacy) value is still readable rather than blank.
 */
export function storeItemTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return STORE_ITEM_TYPE_LABELS[value] ?? value;
}

/**
 * Backend `STORE_ITEM_SLOTS` — the closed `slot` vocabulary, mirrored so the
 * dashboard offers the same values the server accepts (`@IsIn` on create and
 * update). Keep this list in the same order/grouping as the backend file.
 * Do not add a value here the backend rejects, and do not send a value that is
 * not in this list: the API answers 400 `Invalid slot`.
 */
export const STORE_ITEM_SLOTS = [
  // canonical cosmetic slots
  'profile_avatar',
  'profile_frame',
  'profile_background',
  'profile_card',
  'profile_wall_hanging',
  'room_theme',
  'room_wallpaper',
  'room_mic_skin',
  'ludo_board',
  'ludo_dice',
  'ludo_tokens',
  'domino_board',
  'domino_tile_face',
  'domino_tile_back',
  // accepted by room customization / persisted legacy rows
  'room_background',
  'room_join_banner',
  // game + aggregate slots persisted since launch
  'badge',
  'dice',
  'pieces',
  'covers',
  // voucher placements (linked through voucher_definitions.storeItemId)
  'voucher_profile_account_name_change',
  'voucher_profile_display_name_change',
  'voucher_profile_username_change',
  'voucher_room_create',
  'voucher_room_image_change',
  'voucher_room_rename',
] as const;

export type StoreItemSlot = (typeof STORE_ITEM_SLOTS)[number];

const STORE_ITEM_SLOT_LABELS: Readonly<Record<StoreItemSlot, string>> = {
  profile_avatar: 'Profile Avatar',
  profile_frame: 'Profile Frame',
  profile_background: 'Profile Background',
  profile_card: 'Profile Card',
  profile_wall_hanging: 'Wall Hanging',
  room_theme: 'Room Theme',
  room_wallpaper: 'Room Wallpaper',
  room_mic_skin: 'Mic Skin',
  ludo_board: 'Ludo Board',
  ludo_dice: 'Ludo Dice',
  ludo_tokens: 'Ludo Tokens',
  domino_board: 'Domino Board',
  domino_tile_face: 'Domino Tile Face',
  domino_tile_back: 'Domino Tile Back',
  room_background: 'Room Background',
  room_join_banner: 'Room Join Banner',
  badge: 'Badge Slot',
  dice: 'Dice Slot',
  pieces: 'Chess Pieces Slot',
  covers: 'Ludo Covers Slot',
  voucher_profile_account_name_change: 'Voucher — Account Name Change',
  voucher_profile_display_name_change: 'Voucher — Display Name Change',
  voucher_profile_username_change: 'Voucher — Username Change',
  voucher_room_create: 'Voucher — Create Room',
  voucher_room_image_change: 'Voucher — Change Room Image',
  voucher_room_rename: 'Voucher — Rename Room',
};

/** Human label for a persisted slot, falling back to the raw value. */
export function storeItemSlotLabel(value: string | null | undefined): string {
  if (!value) return '';
  return STORE_ITEM_SLOT_LABELS[value as StoreItemSlot] ?? value;
}
