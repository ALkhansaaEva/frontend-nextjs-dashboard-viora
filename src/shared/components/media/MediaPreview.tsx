'use client';

import { useState } from 'react';
import { FileQuestion, Music } from 'lucide-react';
import { mediaPublicUrl } from '@/shared/lib/media-url';
import { SvgaPreview } from './SvgaPreview';

/**
 * The one place media is rendered in this dashboard.
 *
 * Ten call sites were each doing their own `<img>` plus their own ad-hoc
 * fallback, so behaviour diverged (some mutated the DOM on error, some showed a
 * broken-image glyph, some guessed a format). Every media shape is resolved by
 * the shared `mediaPublicUrl()` resolver and rendered by this component.
 *
 * Format handling, and why:
 *   raster (png/jpg/jpeg/webp/gif/avif) → <img>. Animated GIF and animated WebP
 *     animate natively in <img>; no optimiser or image pipeline sits in the
 *     delivery path (the CDN sends the original bytes), so nothing flattens them
 *     to a first frame. `next/image` is deliberately NOT used anywhere in this
 *     dashboard because it has no loader for arbitrary media hosts.
 *   svg → <img>. The backend removes SVG from the new-upload allowlist and
 *     serves existing SVGs with a sandboxing CSP, so an <img> (which never runs
 *     script) is the safe way to display one.
 *   mp4/webm → <video muted loop playsInline>. GIF/WebP cannot carry audio;
 *     these can, and looping is how an animation asset should read.
 *   audio → icon + name. Audio has no visual frame.
 *   svga → <SvgaPreview>. `svgaplayerweb` is imported only for this format and
 *     draws the real movie on a canvas; a parse failure falls through to the
 *     labelled placeholder instead of a still frame.
 *   lottie/riv → icon + name. These need a WASM runtime this dashboard does not
 *     ship, so the stored asset is surfaced with its real extension instead.
 *
 * Failure handling: any format this browser cannot decode (an older browser
 * with no AVIF support, a dead link) falls back to the same labelled icon via
 * `onError` rather than showing a broken-image glyph. A capability probe was
 * considered and dropped — it needs a second decode of a probe asset to learn
 * exactly what `onError` already tells us, and `onError` costs no extra request.
 */

export type MediaPreviewSource =
  | string
  | { url?: string | null; thumbnailUrl?: string | null; path?: string | null }
  | null
  | undefined;

export interface MediaPreviewProps {
  /** Anything `mediaPublicUrl()` accepts: a URL string or a media object. */
  media?: MediaPreviewSource;
  /** Pre-resolved URL. Ignored when `media` yields one. */
  url?: string | null;
  alt?: string;
  className?: string;
  /** Show the extension next to the placeholder, e.g. "No player for .svga". */
  showFormatHint?: boolean;
}

const VIDEO_EXT = new Set(['mp4', 'webm', 'mov', 'm4v']);
const AUDIO_EXT = new Set(['wav', 'ogg', 'oga', 'm4a', 'mp3', 'aac', 'flac']);
/** Player-driven containers with no renderer in this dashboard. */
const UNPLAYABLE_EXT = new Set(['lottie', 'riv', 'glb', 'gltf', 'bin']);

function extensionOf(source: string): string {
  const clean = source.split(/[?#]/)[0] ?? '';
  const name = clean.slice(clean.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

export function MediaPreview({
  media,
  url,
  alt = '',
  className = 'h-full w-full object-cover',
  showFormatHint = false,
}: MediaPreviewProps) {
  const resolved = mediaPublicUrl(media) || (url ?? '') || '';

  // Latch on the URL that failed, not a bare boolean: a component that is
  // re-rendered with a different (fixed) source must recover instead of staying
  // stuck on the placeholder.
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const isFailed = Boolean(resolved) && failedFor === resolved;
  // The catalog still contains 68-byte 1×1 PNGs used as placeholders during QA
  // seeding. They load successfully, so `onError` never fires and the card shows
  // an empty square; treat a 1×1 raster as "no usable artwork" instead.
  const [blankFor, setBlankFor] = useState<string | null>(null);
  const isBlank = Boolean(resolved) && blankFor === resolved;

  const ext = resolved ? extensionOf(resolved) : '';

  const placeholder = (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-slate-400"
      role="img"
      aria-label={ext ? `${ext.toUpperCase()} asset, no inline preview` : 'No media'}
    >
      {AUDIO_EXT.has(ext) ? <Music className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
      {showFormatHint && ext && (
        <span className="text-[9px] font-medium uppercase tracking-wide">
          {UNPLAYABLE_EXT.has(ext) ? `.${ext} · no player` : `.${ext}`}
        </span>
      )}
    </div>
  );

  if (!resolved) return placeholder;
  if (isFailed || isBlank) return placeholder;

  if (VIDEO_EXT.has(ext)) {
    return (
      <video
        src={resolved}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailedFor(resolved)}
        className={className}
      />
    );
  }

  if (ext === 'svga') {
    return (
      <SvgaPreview
        url={resolved}
        className={className}
        onError={() => setFailedFor(resolved)}
      />
    );
  }

  // Audio and the other player-driven containers (lottie/riv/3D) have no
  // inline frame this dashboard can honestly render.
  if (AUDIO_EXT.has(ext) || UNPLAYABLE_EXT.has(ext)) return placeholder;

  // Everything else is a still or an animated raster: <img> animates GIF and
  // animated WebP natively, and we never route media through an optimiser.
  return (
    /* eslint-disable @next/next/no-img-element -- deliberate:
    // `next/image` needs a configured loader for these arbitrary backend media
    // hosts (none exists in this app) and its optimizer re-encodes to a single
    // frame, which would silently destroy every animated GIF and animated WebP.
    // The delivery path serves the original bytes, so a plain <img> is both the
       only correct and the only animation-preserving choice here. */
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      onError={() => setFailedFor(resolved)}
      onLoad={(event) => {
        // SVG is excluded: an intrinsic size of 0 is legal there (viewBox-only
        // files) and would be misread as a blank placeholder.
        if (ext === 'svg') return;
        const image = event.currentTarget;
        if (image.naturalWidth <= 1 && image.naturalHeight <= 1) {
          setBlankFor(resolved);
        }
      }}
      className={className}
    />
  );
}

/** Square thumbnail box used by the cards. */
export function MediaPreviewThumb(props: Omit<MediaPreviewProps, 'className'>) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800">
      <MediaPreview
        {...props}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
