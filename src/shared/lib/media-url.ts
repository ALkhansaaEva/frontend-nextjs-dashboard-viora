/**
 * Media `path` comes back in two shapes from the backend: absolute after an
 * upload (`mediaService.buildAssetUrl`) and bucket-relative on a later read.
 * A relative path is only fetchable through the public proxy route.
 */
import { apiOrigin } from '@/lib/api/base-url';

function isDirectUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/') || value.startsWith('//');
}

/**
 * Every media shape the API returns, in one resolver.
 *
 * The backend does NOT use a single field name, and the domain differs:
 *   Store  → `assets[]` = `{ kind, purpose, platform, url }`        (no media id)
 *   Gift   → `iconMedia` = `{ id, url, mimeType }`                  (plus `iconMediaId`)
 *   Badge  → `icon` = `{ id, bucket, path, thumbnailUrl }`          (no `url`)
 *
 * So a bare string (already a URL) and any of those objects are accepted, and
 * the first usable candidate wins: `url`, then `thumbnailUrl`, then `path`.
 * Only `bucket`/`path` need the public proxy; anything already absolute is
 * returned untouched. Returns '' when there is nothing renderable, which the
 * cards already treat as "show the fallback".
 */
export function mediaPublicUrl(
  media:
    | string
    | { url?: string | null; thumbnailUrl?: string | null; path?: string | null }
    | null
    | undefined,
): string {
  if (!media) return '';
  if (typeof media === 'string') return isDirectUrl(media) ? media : '';
  const candidate = media.url || media.thumbnailUrl || media.path;
  if (!candidate) return '';
  if (isDirectUrl(candidate)) return candidate;
  const origin = apiOrigin();
  // No configured backend means no renderable media — never guess an origin.
  if (!origin) return '';
  return `${origin}/v1/media/proxy/${candidate}`;
}

/**
 * Store items carry media as `assets[]`, so the card has to choose which one is
 * the face of the item. Ordered by intent: the declared `icon`, then the
 * largest/most presentational purposes, then any asset that has a URL at all.
 */
export function storeItemImageUrl(
  assets: ReadonlyArray<{ kind?: string | null; purpose?: string | null; url?: string | null }> | null | undefined,
): string {
  if (!assets?.length) return '';
  const preferred = ['icon', 'preview', 'full', 'thumb'];
  for (const purpose of preferred) {
    const match = assets.find((asset) => asset.purpose === purpose && asset.url);
    const url = match && mediaPublicUrl(match);
    if (url) return url;
  }
  return mediaPublicUrl(assets.find((asset) => Boolean(asset.url)));
}

const MEDIA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only a media_files uuid can be resolved. Legacy rows may still hold an
 * absolute URL in the column, which is already renderable and must not be
 * turned into a 400 from `GET /media/:id` (ParseUUIDPipe).
 */
export function isResolvableMediaId(value: string): boolean {
  return MEDIA_UUID.test(value);
}