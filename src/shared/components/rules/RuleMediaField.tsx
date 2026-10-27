'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload, X } from 'lucide-react';

import mediaService, { type MediaFile } from '@/services/media.service';
import { Button } from '@/shared/components/ui/Button';

export function RuleMediaField({
  value,
  onChange,
  bucket,
  purpose,
  disabled,
  assetPreviewUrl,
}: {
  value: string | null;
  onChange: (mediaId: string | null) => void;
  bucket: 'achievements' | 'tasks' | 'badges';
  purpose: 'achievement-artwork' | 'task-artwork' | 'badge-icon';
  disabled?: boolean;
  /**
   * Resolved display URL for an ALREADY persisted asset. The backend never
   * writes `thumbnailUrl` (always null), so a caller that already holds the
   * media object must pass the proxy URL built from its `path` — otherwise an
   * existing icon previews as "no image" until it is re-uploaded.
   */
  assetPreviewUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setMedia(null);
      if (!localPreviewRef.current) setPreviewUrl(assetPreviewUrl ?? null);
      return;
    }
    // A caller-supplied proxy URL is authoritative: `thumbnailUrl` is never
    // written backend-wide, so resolving it here always yields null.
    if (assetPreviewUrl) {
      setMedia(null);
      setError(null);
      if (!localPreviewRef.current) setPreviewUrl(assetPreviewUrl);
      return;
    }
    let cancelled = false;
    mediaService
      .getAdminFileById(value)
      .then((loaded) => {
        if (cancelled) return;
        setMedia(loaded);
        if (!localPreviewRef.current) setPreviewUrl(loaded.thumbnailUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('The referenced media asset could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [value, assetPreviewUrl]);

  useEffect(
    () => () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    },
    [],
  );

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = URL.createObjectURL(file);
    setPreviewUrl(localPreviewRef.current);
    setBusy(true);
    setError(null);
    try {
      const uploaded = await mediaService.uploadFile(file, bucket, {
        fileKind: 'image',
        filePurpose: purpose,
        altText: file.name,
      });
      setMedia(uploaded);
      onChange(uploaded.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Image upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    localPreviewRef.current = null;
    setPreviewUrl(null);
    setMedia(null);
    setError(null);
    onChange(null);
  };

  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={media?.altText ?? 'Rule artwork preview'} onError={() => { setPreviewUrl(null); setError('The image preview is unavailable. Replace the asset to repair it.'); }} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-7 w-7 text-gray-400" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Artwork</p>
          <p className="mt-0.5 text-xs text-gray-500">Canonical Media asset; JPEG, PNG, WebP, GIF, SVG or AVIF, up to 10 MB.</p>
          {value && <p className="mt-1 truncate font-mono text-[10px] text-gray-400">{value}</p>}
          {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <Button size="sm" variant="outline" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button size="sm" variant="ghost" disabled={disabled || busy} onClick={clear} aria-label="Remove artwork">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
