'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import mediaService from '@/services/media.service';
import { Button } from '@/shared/components/ui/Button';
import { UPLOAD_CONFIG, type UploadProfile } from '@/shared/config/upload';
import { isResolvableMediaId, mediaPublicUrl } from '@/shared/lib/media-url';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

interface MediaAssetIdUploadProps {
  value: string;
  onChange: (mediaId: string) => void;
  disabled?: boolean;
  label?: string;
  /** Which `UPLOAD_CONFIG` profile supplies the bucket, limits and accept list. */
  profile?: UploadProfile;
  /** Shown next to the stored id so the accepted formats stay discoverable. */
  acceptLabel?: string;
}

/** Backend `MediaFile.fileKind` vocabulary, chosen from the file extension. */
const KIND_BY_EXTENSION: Record<string, string> = {
  gif: 'animated_webp',
  webp: 'animated_webp',
  mp4: 'video',
  webm: 'video',
  lottie: 'lottie',
  riv: 'rive',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  mp3: 'audio',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  svg: 'image',
  avif: 'image',
  // SVGA is a protobuf movie container, not an image. The backend serves it as
  // application/octet-stream; `AssetKind` has no svga member, so report the
  // generic animated kind rather than inventing a new vocabulary value.
  svga: 'animated_webp',
};

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Uploads through Media authority and returns the immutable MediaFile UUID.
 *
 * The preview resolves the *stored* record rather than holding a local object
 * URL, so what the operator sees is what the backend will serve — including
 * after a page reload.
 */
export function MediaAssetIdUpload({
  value,
  onChange,
  disabled,
  label = 'Icon asset',
  profile = 'gift',
  acceptLabel,
}: MediaAssetIdUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stored, setStored] = useState<{ url: string; ext: string } | null>(null);
  const config = UPLOAD_CONFIG[profile];

  const allowedExtensions = config.accept
    .split(',')
    .map((entry) => entry.trim().replace(/^\./, '').toLowerCase())
    .filter(Boolean);

  // Resolve the referenced media id against the Media service. A non-uuid value
  // is a legacy absolute URL and is already renderable as-is.
  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setStored(null);
      return;
    }
    if (!isResolvableMediaId(value)) {
      setStored({ url: value, ext: extensionOf(value.split('/').pop() ?? '') });
      return;
    }
    void mediaService
      .getAdminFileById(value)
      .then((media) => {
        if (cancelled) return;
        const url = mediaPublicUrl(media);
        setStored(url ? { url, ext: extensionOf(media.path) } : null);
      })
      .catch(() => {
        if (!cancelled) setStored(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function upload(file: File) {
    setError(null);
    // The backend gates on extension + magic bytes and never trusts the
    // client's Content-Type, and `.lottie`/`.riv` arrive with a generic or
    // empty `file.type`. Mirroring the extension check here keeps the browser
    // from rejecting files the server would accept.
    const ext = extensionOf(file.name);
    if (!allowedExtensions.includes(ext)) {
      setError(`Unsupported file type .${ext || '?'}. Accepted: ${config.accept}`);
      return;
    }
    if (file.size > config.maxSize) {
      setError(`The file must be ${Math.round(config.maxSize / (1024 * 1024))} MB or smaller.`);
      return;
    }
    setBusy(true);
    try {
      const media = await mediaService.uploadFile(file, config.bucket, {
        fileKind: KIND_BY_EXTENSION[ext] ?? config.fileKind,
        filePurpose: config.filePurpose,
      });
      if (!media?.id) {
        setError('Upload did not return a media id.');
        return;
      }
      onChange(media.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const preview = stored?.url ?? '';

  return (
    <div className="space-y-2">
      <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
          {/* Shared renderer: animated GIF/WebP animate natively, video gets a
              muted looping <video>, SVGA plays on a canvas, and formats with no
              player in this dashboard (lottie/riv) show their real extension
              instead of a fake still frame. */}
          <MediaPreview url={preview} showFormatHint className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[11px] text-slate-500">{value || 'No media selected'}</p>
          {(acceptLabel ?? config.accept) && (
            <p className="truncate text-[11px] text-slate-400">{acceptLabel ?? config.accept}</p>
          )}
          {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={config.accept}
          className="sr-only"
          disabled={disabled || busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" size="sm" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="hidden sm:inline">Upload</span>
        </Button>
      </div>
    </div>
  );
}