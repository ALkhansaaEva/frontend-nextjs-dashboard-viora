'use client';

import { useState } from 'react';
import { X, Pencil, Image } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { FileUpload } from '@/shared/components/upload/FileUpload';
import type { StoreAssetData } from './AssetForm';

const ASSET_KINDS = [
  { value: 'image', label: 'Image' },
  { value: 'animated_webp', label: 'Animated WebP' },
  { value: 'lottie', label: 'Lottie' },
  { value: 'rive', label: 'Rive' },
  { value: 'audio', label: 'Audio' },
  { value: 'spritesheet', label: 'Spritesheet' },
  { value: 'svg', label: 'SVG' },
];

const ASSET_PURPOSES = [
  { value: 'icon', label: 'Icon' },
  { value: 'thumb', label: 'Thumbnail' },
  { value: 'preview', label: 'Preview' },
  { value: 'full', label: 'Full' },
  { value: 'sprite', label: 'Sprite' },
  { value: 'texture', label: 'Texture' },
  { value: 'audio', label: 'Audio' },
  { value: 'sfx_roll', label: 'SFX Roll' },
  { value: 'sfx_move', label: 'SFX Move' },
  { value: 'sfx_win', label: 'SFX Win' },
  { value: 'sfx_land', label: 'SFX Land' },
  { value: 'sfx_capture', label: 'SFX Capture' },
  { value: 'sfx_click', label: 'SFX Click' },
  { value: 'sfx_ambient', label: 'SFX Ambient' },
];

const ASSET_PLATFORMS = [
  { value: 'all', label: 'All' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'web', label: 'Web' },
];

function getUploadProfile(kind: string): 'store' | 'achievement' | 'gift' {
  if (kind === 'audio') return 'gift';
  return 'store';
}

interface AssetCardProps {
  asset: StoreAssetData;
  onRemove?: () => void;
  onEdit?: (updated: StoreAssetData) => void;
}

export function AssetCard({ asset, onRemove, onEdit }: AssetCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StoreAssetData>({ ...asset });

  const handleSave = () => {
    onEdit?.(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft({ ...asset });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-violet-200 dark:border-violet-800 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Select
            label="Kind"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
            options={ASSET_KINDS}
          />
          <Select
            label="Purpose"
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
            options={ASSET_PURPOSES}
          />
          <Select
            label="Platform"
            value={draft.platform}
            onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
            options={ASSET_PLATFORMS}
          />
        </div>
        <FileUpload
          profile={getUploadProfile(draft.kind)}
          label="Asset URL"
          placeholder="Paste URL or upload file"
          value={draft.url}
          onChange={(url) => setDraft({ ...draft, url })}
          previewSize="sm"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!draft.url}
            className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border">
      {asset.url.match(/\.(png|gif|webp|svg|jpg|jpeg|avif)/i) ? (
        <img src={asset.url} alt="" className="w-8 h-8 object-contain rounded shrink-0" />
      ) : (
        <Image className="w-4 h-4 text-blue-500 shrink-0" />
      )}
      <span className="text-sm font-medium">{asset.kind}</span>
      <span className="text-xs text-gray-500">• {asset.purpose}</span>
      <span className="text-xs text-gray-400">• {asset.platform}</span>
      <span className="text-xs text-gray-400 flex-1 truncate">{asset.url}</span>
      {onEdit && (
        <button
          onClick={() => setEditing(true)}
          className="p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded shrink-0 transition-colors"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}
      {onRemove && (
        <button onClick={onRemove} className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
