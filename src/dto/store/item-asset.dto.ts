// Item Asset DTO - Client sends these fields
export enum AssetKind {
  IMAGE = 'image',
  ANIMATED_WEBP = 'animated_webp',
  LOTTIE = 'lottie',
  RIVE = 'rive',
  AUDIO = 'audio',
  SPRITESHEET = 'spritesheet',
  SVG = 'svg',
}

export enum AssetPurpose {
  THUMB = 'thumbnail',
  PREVIEW = 'preview',
  FULL = 'full',
}

export enum AssetPlatform {
  ANDROID = 'android',
  IOS = 'ios',
  WEB = 'web',
  ALL = 'all',
}

// DTO that client sends - NO hash, NO sizeBytes
export interface ItemAssetDto {
  kind: AssetKind;
  purpose: AssetPurpose;
  url: string;
  platform?: AssetPlatform;
  version?: number;
  tags?: string[];
}

// Internal - AFTER enrichment (includes computed fields)
export interface ItemAsset extends ItemAssetDto {
  hash: string;
  sizeBytes: number;
}

// ponytail: enrichment is done server-side by AssetEnricherService — no browser fetch needed