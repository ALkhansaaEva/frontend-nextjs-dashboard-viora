'use client';

import { useCallback } from 'react';
import { Upload, Loader2, X, Image } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useUpload } from '@/shared/hooks/useUpload';
import type { UploadProfile } from '@/shared/config/upload';

interface FileUploadProps {
  profile: UploadProfile;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  label?: string;
  previewSize?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

export function FileUpload({
  profile,
  value,
  onChange,
  placeholder,
  label,
  previewSize = 'md',
}: FileUploadProps) {
  const { isUploading, error, inputRef, accepted, handleFile, trigger, reset } = useUpload(profile);

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await handleFile(file);
    if (url) onChange(url);
  }, [handleFile, onChange]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || `Upload or paste URL`}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accepted}
          onChange={onFileChange}
          className="hidden"
        />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={trigger}
            disabled={isUploading}
            className="shrink-0"
          >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
        </Button>
      </div>

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}

      {value && (
        <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className={`${sizeMap[previewSize]} shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center`}>
            {value.match(/\.(png|gif|webp|svg|jpg|jpeg|avif)/i) ? (
              <img src={value} alt="" className="w-full h-full object-contain" />
            ) : (
              <Image className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <span className="text-xs text-gray-500 truncate flex-1">{value}</span>
          <button
            onClick={() => { onChange(''); reset(); }}
            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
