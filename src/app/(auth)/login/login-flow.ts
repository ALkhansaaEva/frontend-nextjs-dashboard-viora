export type LoginMode = 'password' | 'otp' | 'forgot' | 'reset';

/**
 * Links in transactional email open the login page with an intent flag
 * (`?reset=1`, `?otp=1`) instead of carrying the code in the URL, so the code
 * never lands in browser history, referrers or analytics.
 */
export function authIntentFromSearch(search: string): LoginMode | null {
  const params = new URLSearchParams(search);
  if (params.get('reset') === '1') return 'reset';
  if (params.get('otp') === '1') return 'otp';
  return null;
}

/** Returns a user-facing error, or null when the pair is acceptable. */
export function validateNewPassword(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  if (password !== confirmation) return 'The two passwords do not match.';
  return null;
}
