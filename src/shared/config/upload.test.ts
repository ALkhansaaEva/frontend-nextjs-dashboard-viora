import { describe, expect, it } from 'vitest';
import { UPLOAD_CONFIG } from './upload';

/**
 * SVGA is an explicit product requirement and a container the backend only
 * accepts under the `animations` category. Losing it from this list silently
 * removes the upload path, so pin it here rather than in a page component.
 */
describe('gift animation upload profile', () => {
  const profile = UPLOAD_CONFIG.giftAnimation;

  it('accepts the svga container', () => {
    expect(profile.accept.split(',')).toContain('.svga');
  });

  it('keeps the backend animations-category size ceiling (20 MB)', () => {
    expect(profile.maxSize).toBe(20 * 1024 * 1024);
  });

  it('declares svga as an animation asset, not an image', () => {
    expect(profile.filePurpose).toBe('animation');
    expect(profile.acceptMime).toContain('application/octet-stream');
  });
});
