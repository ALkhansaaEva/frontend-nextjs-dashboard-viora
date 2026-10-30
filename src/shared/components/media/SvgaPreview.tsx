'use client';

import { useEffect, useRef } from 'react';

interface SvgaPreviewProps {
  url: string;
  className?: string;
  /** Called when the container cannot be parsed, so the caller can fall back. */
  onError?: () => void;
}

interface SvgaPlayer {
  loops: number;
  clearsAfterStop: boolean;
  setContentMode: (mode: string) => void;
  setVideoItem: (item: unknown) => void;
  startAnimation: () => void;
  stopAnimation?: () => void;
  clear?: () => void;
}

interface SvgaParser {
  load: (
    url: string,
    success: (item: unknown) => void,
    failure?: () => void,
  ) => void;
}

/**
 * Plays an `.svga` movie on a canvas.
 *
 * `svgaplayerweb` needs `window`/canvas and is ~100 KB, so it is imported on
 * demand: only an actual SVGA asset pays for the parser. The media proxy sends
 * `Access-Control-Allow-Origin: *`, which the player's XHR (arraybuffer) needs.
 *
 * SVGA is a protobuf movie container — the backend already validated the `PKG`
 * header on upload, and the player only decodes frames; nothing is executed.
 */
export function SvgaPreview({ url, className, onError }: SvgaPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let player: SvgaPlayer | null = null;

    void import('svgaplayerweb')
      .then((module) => {
        const SVGA = (module as { default?: unknown }).default ?? module;
        const { Player, Parser } = SVGA as {
          // The library only creates (and sizes) its own drawing canvas when
          // given a container element. Handing it a <canvas> skips `_init` and
          // the animation renders into nothing — hence the wrapper div.
          Player: new (container: HTMLDivElement) => SvgaPlayer;
          Parser: new () => SvgaParser;
        };
        if (cancelled || !containerRef.current) return;

        player = new Player(containerRef.current);
        player.loops = 0;
        player.clearsAfterStop = false;
        player.setContentMode('AspectFit');

        new Parser().load(
          url,
          (item) => {
            if (cancelled || !player) return;
            player.setVideoItem(item);
            player.startAnimation();
          },
          () => {
            if (!cancelled) errorRef.current?.();
          },
        );
      })
      .catch(() => errorRef.current?.());

    return () => {
      cancelled = true;
      try {
        player?.stopAnimation?.();
        player?.clear?.();
      } catch {
        // Teardown of a half-initialised player must not break unmount.
      }
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="SVGA animation preview"
      className={className}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  );
}
