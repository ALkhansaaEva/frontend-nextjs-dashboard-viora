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
 * Backend `COSMETIC_SLOTS` — the canonical `slot` vocabulary, mirrored so the
 * dashboard can offer it as a select instead of free text.
 *
 * IMPORTANT: this is *exposed, not enforced*. The backend `CreateItemDto.slot`
 * is a bare `@IsString()` with no value set (historical rows carry values the
 * enum no longer lists), so adding `@IsIn` server-side would reject them. The
 * Swagger example and this select make the canonical values discoverable; the
 * field itself stays a string so legacy records remain editable.
 */
export const STORE_ITEM_SLOTS = [
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
] as const;
