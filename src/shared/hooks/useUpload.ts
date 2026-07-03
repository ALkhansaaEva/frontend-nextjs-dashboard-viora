'use client';

import { useState, useRef, useCallback } from 'react';
import { mediaService } from '@/services/media.service';
import { UPLOAD_CONFIG } from '@/shared/config/upload';
import type { UploadProfile } from '@/shared/config/upload';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://backend-fastify-nestjs-viora.vercel.app/v1';
const API_ORIGIN = API_BASE.replace(/\/v1\/?$/, '');

function toDisplayUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  return `${API_ORIGIN}/v1/media/proxy/${path}`;
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

    if (!cfg.acceptMime.includes(file.type as any)) {
      const msg = `Unsupported file type: ${file.type}. Allowed: ${cfg.accept}`;
      setError(msg);
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
      return toDisplayUrl(uploaded.path);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [profile]);

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
