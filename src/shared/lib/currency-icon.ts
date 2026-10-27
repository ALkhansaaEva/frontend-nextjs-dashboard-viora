const CANONICAL_CURRENCY_ICON_PATTERN =
  /^\/v1\/media\/proxy\/[a-z0-9_-]{1,64}\/[a-z0-9][a-z0-9._-]{0,179}$/i;

export const CURRENCY_ICON_ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/svg+xml'] as const;
export const CURRENCY_ICON_MAX_BYTES = 5 * 1024 * 1024;

/** Normalizes MediaController upload output into CurrencyDisplayService's exact contract. */
export function canonicalCurrencyIconRef(upload: { bucket: string; path: string }): string {
  const raw = upload.path.trim();
  let pathname = raw;
  try {
    pathname = new URL(raw).pathname;
  } catch {
    // Relative media paths are valid upload responses when MEDIA_BASE_URL is unset.
  }

  let candidate: string;
  if (pathname.startsWith('/v1/media/proxy/')) {
    candidate = pathname;
  } else {
    const relative = pathname.replace(/^\/+/, '');
    const bucketPrefix = `${upload.bucket}/`;
    candidate = `/v1/media/proxy/${relative.startsWith(bucketPrefix) ? relative : `${bucketPrefix}${relative}`}`;
  }

  if (!CANONICAL_CURRENCY_ICON_PATTERN.test(candidate)) {
    throw new Error('The uploaded image did not return a canonical public media reference.');
  }
  return candidate;
}

export function currencyIconFileError(file: { type: string; size: number }): string | null {
  if (!CURRENCY_ICON_ACCEPT.includes(file.type as (typeof CURRENCY_ICON_ACCEPT)[number])) {
    return 'Use PNG, JPG, WebP, AVIF, or SVG.';
  }
  if (file.size <= 0) return 'The selected image is empty.';
  if (file.size > CURRENCY_ICON_MAX_BYTES) return 'The image must be 5 MB or smaller.';
  return null;
}
