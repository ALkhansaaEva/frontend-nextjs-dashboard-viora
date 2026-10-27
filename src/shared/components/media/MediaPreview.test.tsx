// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MediaPreview } from './MediaPreview';

// The real player needs canvas + window; the routing decision is what these
// tests cover, so the module is replaced by a synchronous stub.
const svgaState = vi.hoisted(() => ({ fail: false }));
vi.mock('svgaplayerweb', () => {
  class Player {
    loops = 0;
    clearsAfterStop = true;
    setContentMode() {}
    setVideoItem() {}
    startAnimation() {}
    stopAnimation() {}
    clear() {}
  }
  class Parser {
    load(_url: string, ok: (item: unknown) => void, fail?: () => void) {
      if (svgaState.fail) fail?.();
      else ok({});
    }
  }
  return { Player, Parser, default: { Player, Parser } };
});

/**
 * The whole point of MediaPreview is that format decisions live in ONE place, so
 * these tests assert the routing decisions themselves — which element renders,
 * and that an undecodable source degrades to a labelled placeholder rather than
 * a broken-image glyph.
 */
const CDN = (file: string) => `https://cdn.example.com/v1/media/proxy/store/${file}`;

function renderPreview(url: string | null, props: Record<string, unknown> = {}) {
  return render(<MediaPreview url={url} {...props} />);
}

describe('MediaPreview', () => {
  it('renders a plain <img> for a still raster and keeps the animation-capable path', () => {
    const { container } = renderPreview(CDN('icon.png'));
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(CDN('icon.png'));
  });

  it('renders animated GIF and animated WebP through the same <img> so they animate natively', () => {
    for (const file of ['anim.gif', 'anim.webp', 'anim.avif', 'anim.png']) {
      const { container } = renderPreview(CDN(file));
      // A <video> or placeholder here would mean the animation is being
      // flattened or refused.
      expect(container.querySelector('img'), file).not.toBeNull();
      expect(container.querySelector('video'), file).toBeNull();
    }
  });

  it('renders SVG through <img>, which never executes script', () => {
    const { container } = renderPreview(CDN('logo.svg'));
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('renders video as a muted, looping <video>', () => {
    const { container } = renderPreview(CDN('clip.mp4'));
    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBe(CDN('clip.mp4'));
    // Muted + loop is what makes an animation asset read as an animation and
    // what stops autoplay from being blocked by the browser. React sets `muted`
    // as a DOM property rather than a content attribute, so assert the property.
    expect((video as HTMLVideoElement).muted).toBe(true);
    expect((video as HTMLVideoElement).loop).toBe(true);
    expect(container.querySelector('img')).toBeNull();
  });

  it('treats webm as video too', () => {
    const { container } = renderPreview(CDN('clip.webm'));
    expect(container.querySelector('video')).not.toBeNull();
  });

  it.each(['wav', 'ogg', 'm4a', 'mp3'])(
    'does not fake an audio asset (%s) as a still frame',
    (ext) => {
      const { container } = renderPreview(CDN(`tone.${ext}`));
      expect(container.querySelector('img'), ext).toBeNull();
      expect(container.querySelector('video'), ext).toBeNull();
    },
  );

  it('plays svga on a canvas instead of faking a still frame', () => {
    const { container } = renderPreview(CDN('anim.svga'));
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to the placeholder when an svga container cannot be parsed', async () => {
    svgaState.fail = true;
    const { container } = renderPreview(CDN('broken.svga'));
    await waitFor(() => {
      expect(container.querySelector('[role="img"]')).not.toBeNull();
    });
    svgaState.fail = false;
  });

  it.each(['lottie', 'riv', 'glb'])(
    'surfaces the player-driven container %s by name instead of faking a still',
    (ext) => {
      const { container } = renderPreview(CDN(`asset.${ext}`), { showFormatHint: true });
      expect(container.querySelector('img'), ext).toBeNull();
      expect(screen.getByText(new RegExp(ext, 'i')), ext).toBeTruthy();
    },
  );

  it('renders a placeholder when there is no media at all', () => {
    const { container } = renderPreview(null);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });

  it('falls back to the placeholder when the source cannot be decoded', () => {
    const { container } = renderPreview(CDN('broken.webp'));
    const img = container.querySelector('img');
    expect(img).not.toBeNull();

    // An older browser with no AVIF support, or a dead link: onError must
    // produce the labelled placeholder, not a broken-image glyph.
    fireEvent.error(img as HTMLImageElement);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });

  it('recovers when the source is replaced after a failure', () => {
    const { container, rerender } = render(<MediaPreview url={CDN('broken.png')} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    // The failure latch is keyed on the URL, so a fixed source must render
    // again instead of staying stuck on the placeholder.
    rerender(<MediaPreview url={CDN('fixed.png')} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(CDN('fixed.png'));
  });

  it('resolves a media object through the shared resolver', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://evaka.test:4444/v1');
    const { container } = render(
      <MediaPreview media={{ path: 'store/aabbcc.png' }} />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://evaka.test:4444/v1/media/proxy/store/aabbcc.png',
    );
    vi.unstubAllEnvs();
  });

  it('shows the placeholder instead of guessing an origin when no backend is configured', () => {
    // There is no default backend: a relative media path is only renderable
    // through a configured origin, and inventing one would call the wrong host.
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const { container } = render(
      <MediaPreview media={{ path: 'store/aabbcc.png' }} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('No media');
    vi.unstubAllEnvs();
  });

  it('passes an absolute url through untouched', () => {
    const abs = 'https://evaka.store/media/store/aabbcc.png';
    const { container } = render(<MediaPreview media={{ url: abs }} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(abs);
  });

  it('ignores query strings when deciding the format', () => {
    const { container } = renderPreview(CDN('clip.mp4?v=3'));
    expect(container.querySelector('video')).not.toBeNull();
  });
});
