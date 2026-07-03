'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { FileUpload } from '@/shared/components/upload/FileUpload';
import { AssetCard } from './AssetCard';

export type StoreAssetData = {
  kind: string;
  purpose: string;
  url: string;
  platform: string;
  version?: number;
};

export const defaultAssetData: StoreAssetData = {
  kind: 'image',
  purpose: 'icon',
  platform: 'all',
  url: '',
  version: 1,
};

const ASSET_KINDS = [
  { value: 'image', label: '🖼️ Image' },
  { value: 'animated_webp', label: '🎞️ Animated WebP' },
  { value: 'lottie', label: '🎨 Lottie' },
  { value: 'rive', label: '🧩 Rive' },
  { value: 'audio', label: '🔊 Audio' },
  { value: 'spritesheet', label: '📇 Spritesheet' },
  { value: 'svg', label: '📐 SVG' },
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

const defaultAsset: StoreAssetData = { ...defaultAssetData };

interface AssetFormProps {
  assets: StoreAssetData[];
  onChange: (assets: StoreAssetData[]) => void;
  pendingAsset: StoreAssetData;
  onPendingChange: (asset: StoreAssetData) => void;
}

export function AssetForm({ assets, onChange, pendingAsset, onPendingChange }: AssetFormProps) {
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (pendingAsset.url) {
      onChange([...assets, pendingAsset]);
      onPendingChange(defaultAsset);
      setShowForm(false);
    }
  };

  return (
    <div className="sm:col-span-2 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Assets * <span className="text-gray-400">(Upload file or paste URL)</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Upload className="w-4 h-4 mr-1" /> {showForm ? 'Cancel' : 'Add Asset'}
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Kind"
              value={pendingAsset.kind}
              onChange={(e) => onPendingChange({ ...pendingAsset, kind: e.target.value })}
              options={ASSET_KINDS}
            />
            <Select
              label="Purpose"
              value={pendingAsset.purpose}
              onChange={(e) => onPendingChange({ ...pendingAsset, purpose: e.target.value })}
              options={ASSET_PURPOSES}
            />
            <Select
              label="Platform"
              value={pendingAsset.platform}
              onChange={(e) => onPendingChange({ ...pendingAsset, platform: e.target.value })}
              options={ASSET_PLATFORMS}
            />
            <Input
              label="Version"
              type="number"
              value={pendingAsset.version || 1}
              onChange={(e) => onPendingChange({ ...pendingAsset, version: parseInt(e.target.value) || 1 })}
            />
          </div>

          <FileUpload
            profile="store"
            label="Asset URL *"
            placeholder="https://cdn.viora.com/assets/item.png"
            value={pendingAsset.url}
            onChange={(v) => onPendingChange({ ...pendingAsset, url: v })}
          />

          <Button type="button" size="sm" onClick={handleAdd} disabled={!pendingAsset.url}>
            Add this Asset
          </Button>
        </div>
      )}

      {assets.length > 0 ? (
        <div className="space-y-2">
          {assets.map((asset, idx) => (
            <AssetCard
              key={idx}
              asset={asset}
              onEdit={(updated) => {
                const next = [...assets];
                next[idx] = updated;
                onChange(next);
              }}
              onRemove={() => onChange(assets.filter((_, i) => i !== idx))}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Add at least one asset (upload or URL)</p>
      )}
    </div>
  );
}
