/**
 * String-safe integer formatting for GAME_CURRENCY amounts.
 *
 * Backend GAME_CURRENCY columns are `numeric(30,0)`, transported as strings
 * specifically so amounts never pass through a JS `number` (max safe integer
 * is 2^53-1 ≈ 9.007e15 — a 30-digit balance overflows that silently). Never
 * do `Number(amount).toLocaleString()` on an authoritative balance; use this
 * instead, which only ever does string manipulation.
 */

/** Inserts thousands separators into a decimal digit string without ever
 * parsing it as a number. Handles an optional leading `-`. */
export function formatIntegerString(value: string | number | null | undefined): string {
  if (value == null) return 'N/A';
  const str = String(value).trim();
  const negative = str.startsWith('-');
  const digits = negative ? str.slice(1) : str;
  if (!/^[0-9]+$/.test(digits)) return str; // not a plain integer string — render as-is rather than guess
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return negative ? `-${withSeparators}` : withSeparators;
}

/** Positive-integer-string validator matching the backend's own
 * `/^[1-9][0-9]*$/` GAME_CURRENCY pattern (rejects "0", leading zeros,
 * decimals, scientific notation, signs). */
export function isPositiveIntegerString(value: string): boolean {
  return /^[1-9][0-9]*$/.test(value);
}

/** Strips everything but digits as the user types — keeps monetary input
 * state a plain digit string end to end, never a parsed Number. */
export function sanitizeIntegerInput(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

/** Exact comparison for non-negative integer strings without Number coercion. */
export function compareUnsignedIntegerStrings(left: string, right: string): number {
  const normalize = (value: string) => value.replace(/^0+(?=\d)/, '');
  const a = normalize(left);
  const b = normalize(right);
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b)) throw new Error('Expected unsigned integer strings.');
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  return a === b ? 0 : a < b ? -1 : 1;
}
