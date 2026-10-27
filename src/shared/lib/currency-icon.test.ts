import { describe, expect, it } from 'vitest';
import { canonicalCurrencyIconRef, currencyIconFileError } from './currency-icon';

describe('currency icon media contract', () => {
  it('keeps the canonical relative proxy path', () => {
    expect(canonicalCurrencyIconRef({ bucket: 'assets', path: '/v1/media/proxy/assets/coin.webp' }))
      .toBe('/v1/media/proxy/assets/coin.webp');
  });

  it('extracts the canonical pathname from an absolute media URL', () => {
    expect(canonicalCurrencyIconRef({
      bucket: 'assets',
      path: 'https://cdn.example.test/v1/media/proxy/assets/coin.png',
    })).toBe('/v1/media/proxy/assets/coin.png');
  });

  it('normalizes a storage-relative upload path', () => {
    expect(canonicalCurrencyIconRef({ bucket: 'assets', path: 'assets/coin.avif' }))
      .toBe('/v1/media/proxy/assets/coin.avif');
  });

  it('rejects unsupported and oversized files before upload', () => {
    expect(currencyIconFileError({ type: 'application/pdf', size: 20 })).toContain('PNG');
    expect(currencyIconFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toContain('5 MB');
    expect(currencyIconFileError({ type: 'image/webp', size: 1024 })).toBeNull();
  });
});
