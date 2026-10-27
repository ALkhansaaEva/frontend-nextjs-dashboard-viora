'use client';

import { useState, useRef, useCallback } from 'react';
import { mediaService } from '@/services/media.service';
import { UPLOAD_CONFIG } from '@/shared/config/upload';
import { mediaPublicUrl } from '@/shared/lib/media-url';
import type { UploadProfile } from '@/shared/config/upload';

/**
 * `api-client` rejects with a plain `{ message, statusCode, code }` object,
 * NOT an `Error`, so an `instanceof Error` check always fell through to the
 * generic "Upload failed" and hid the backend's real reason (e.g.
 * "Unsupported file extension: .jfif"). Read `message` off whatever we get.
 */
function errorMessage(err: unknown): string {
  if (typeof err === 'string' && err) return err;
  const message = (err as { message?: string } | null)?.message;
  return message && message !== 'Request failed with status code 400'
    ? message
    : 'Upload failed';
}

export interface UseUploadReturn {
  isUploading: boolean;
  error: string | null;
  inputRef: React.RefObject<HTMLInputElement>;
  accepted: string;
  handleFile: (file: File) => Promise<string | null>;
  trigger: () => void;
  reset: () => void;
}

export function useUpload(profile: UploadProfile): UseUploadReturn {
  const cfg = UPLOAD_CONFIG[profile];
  const inputRef = useRef<HTMLInputElement>(null) as unknown as React.RefObject<HTMLInputElement>;
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File): Promise<string | null> => {
    setError(null);

// The backend gates on the file *extension* plus magic bytes and never
    // trusts the client Content-Type. `file.type` is browser-reported and
    // frequently absent or odd ("" , "image/pjpeg", "image/x-ms-bmp"), so
    // matching it against an exact MIME list rejected files the server would
    // happily accept. Gate on the extension instead and let the server be
    // the authority on content.
    const ext = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase();
    const acceptedExts = cfg.accept
      .split(',')
      .map((entry) => entry.trim().replace(/^\./, '').toLowerCase())
      .filter(Boolean);
    if (!ext || !acceptedExts.includes(ext)) {
      setError(`Unsupported file type .${ext || '?'}. Accepted: ${cfg.accept}`);
      return null;
    }

    if (file.size > cfg.maxSize) {
      const mb = cfg.maxSize / (1024 * 1024);
      const msg = `File too large. Maximum ${mb}MB.`;
      setError(msg);
      return null;
    }

    setIsUploading(true);
    try {
      const uploaded = await mediaService.uploadFile(
        file,
        cfg.bucket,
        { fileKind: cfg.fileKind, filePurpose: cfg.filePurpose },
      );
      return mediaPublicUrl(uploaded) || null;
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [cfg.accept, cfg.bucket, cfg.fileKind, cfg.filePurpose, cfg.maxSize]);

  const trigger = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const reset = useCallback(() => {
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  return {
    isUploading,
    error,
    inputRef,
    accepted: cfg.accept,
    handleFile,
    trigger,
    reset,
  };
}
