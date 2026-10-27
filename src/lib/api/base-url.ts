/**
 * The only reader of NEXT_PUBLIC_API_URL.
 *
 * There is deliberately no default value: a missing setting must surface as a
 * configuration error, not silently send traffic to a retired backend.
 */
export function apiBaseUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  return configured ? configured.replace(/\/+$/, '') : null;
}

/** Backend origin — the base URL without the trailing `/v1`. */
export function apiOrigin(): string | null {
  return apiBaseUrl()?.replace(/\/v1$/, '') ?? null;
}
