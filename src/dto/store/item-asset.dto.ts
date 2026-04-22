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

// Service: Enrich assets with hash and size
export class AssetEnrichmentService {
  private readonly axios = require('axios');
  private readonly crypto = require('crypto');

  async enrichAsset(asset: ItemAssetDto): Promise<ItemAsset> {
    const { url, kind, purpose, platform, version, tags } = asset;

    // Download file and compute hash
    const { hash, sizeBytes } = await this.computeHashAndSize(url);

    return {
      kind,
      url,
      purpose,
      platform: platform || AssetPlatform.ALL,
      version: version || 1,
      tags: tags || [],
      hash,      // Computed internally
      sizeBytes, // Computed internally
    };
  }

  async enrichAssets(assets: ItemAssetDto[]): Promise<ItemAsset[]> {
    return Promise.all(assets.map(asset => this.enrichAsset(asset)));
  }

  private async computeHashAndSize(url: string): Promise<{ hash: string; sizeBytes: number }> {
    try {
      const response = await this.axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        maxContentLength: 50 * 1024 * 1024, // 50MB max
      });

      const buffer = Buffer.from(response.data);
      const hash = this.crypto.createHash('sha256').update(buffer).digest('hex');

      return {
        hash: `sha256:${hash}`,
        sizeBytes: buffer.length,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to compute hash for ${url}:`, message);
      throw new Error(`Invalid asset URL: ${url}`);
    }
  }
}

// Example usage in a service:
// const enrichmentService = new AssetEnrichmentService();
// const enrichedAssets = await enrichmentService.enrichAssets(createItemDto.assets);