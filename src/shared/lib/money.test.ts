import { describe, expect, it } from 'vitest';
import {
  compareUnsignedIntegerStrings,
  formatIntegerString,
  isPositiveIntegerString,
  sanitizeIntegerInput,
} from '@/shared/lib/money';

const PRECISION_VALUE = '123456789012345678901234';

describe('money (string-safe GAME_CURRENCY handling)', () => {
  it('keeps a 24-digit GAME_CURRENCY amount byte-exact', () => {
    expect(formatIntegerString(PRECISION_VALUE)).toBe('123,456,789,012,345,678,901,234');
    expect(formatIntegerString(PRECISION_VALUE).replace(/,/g, '')).toBe(PRECISION_VALUE);
  });

  it('never routes large values through Number', () => {
    // Number(PRECISION_VALUE) would collapse to 1.2345678901234568e+23 —
    // the formatter must not.
    expect(formatIntegerString(PRECISION_VALUE)).not.toContain('e+');
  });

  it('validates positive integer strings', () => {
    expect(isPositiveIntegerString('100')).toBe(true);
    expect(isPositiveIntegerString('0')).toBe(false);
    expect(isPositiveIntegerString('-5')).toBe(false);
    expect(isPositiveIntegerString('1.5')).toBe(false);
    expect(isPositiveIntegerString(PRECISION_VALUE)).toBe(true);
  });

  it('sanitizes input without coercing magnitude', () => {
    expect(sanitizeIntegerInput('abc12x3')).toBe('123');
    expect(sanitizeIntegerInput(PRECISION_VALUE)).toBe(PRECISION_VALUE);
  });

  it('compares values larger than Number.MAX_SAFE_INTEGER exactly', () => {
    expect(compareUnsignedIntegerStrings('999999999999999999999999999999', '100000000000000000000000000000')).toBe(1);
    expect(compareUnsignedIntegerStrings('00042', '42')).toBe(0);
    expect(compareUnsignedIntegerStrings('9', '10')).toBe(-1);
  });
});
