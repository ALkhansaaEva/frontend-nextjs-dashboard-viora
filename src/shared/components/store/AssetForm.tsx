'use client';

import { useState } from 'react';
import { X, Image, Upload } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';

export type StoreAssetData = {
  kind: string;
  purpose: string;
  url: string;
  platform: string;
  version?: number;
};

const defaultAsset: StoreAssetData = {
  kind: 'image',
  purpose: 'icon',
  platform: 'all',
  url: '',
  version: 1,
};

interface AssetFormProps {
  assets: StoreAssetData[];
  onChange: (assets: StoreAssetData[]) => void;
}

export function AssetForm({ assets, onChange }: AssetFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [newAsset, setNewAsset] = useState<StoreAssetData>(defaultAsset);

  const isValidUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://');

  const handleAdd = () => {
    if (newAsset.url && isValidUrl(newAsset.url)) {
      onChange([...assets, newAsset]);
      setNewAsset(defaultAsset);
      setShowForm(false);
    }
  };

  const handleRemove = (index: number) => {
    onChange(assets.filter((_, i) => i !== index));
  };

  return (
    <div className="sm:col-span-2 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Assets * <span className="text-red-500">(CDN URL required)</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Upload className="w-4 h-4 mr-1" /> Add Asset
        </Button>
      </div>

      {showForm && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Kind"
              value={newAsset.kind}
              onChange={(e) => setNewAsset({ ...newAsset, kind: e.target.value })}
              options={[
                { value: 'image', label: '🖼️ Image' },
                { value: 'animated_webp', label: '🎬 Animated' },
                { value: 'lottie', label: '🎨 Lottie' },
                { value: 'audio', label: '🔊 Audio' },
                { value: 'svg', label: '📐 SVG' },
              ]}
            />
            <Select
              label="Purpose"
              value={newAsset.purpose}
              onChange={(e) => setNewAsset({ ...newAsset, purpose: e.target.value })}
              options={[
                { value: 'icon', label: 'Icon' },
                { value: 'thumbnail', label: 'Thumbnail' },
                { value: 'preview', label: 'Preview' },
                { value: 'full', label: 'Full' },
              ]}
            />
            <Select
              label="Platform"
              value={newAsset.platform}
              onChange={(e) => setNewAsset({ ...newAsset, platform: e.target.value })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'android', label: 'Android' },
                { value: 'ios', label: 'iOS' },
                { value: 'web', label: 'Web' },
              ]}
            />
            <Input
              label="Version"
              type="number"
              value={newAsset.version || 1}
              onChange={(e) => setNewAsset({ ...newAsset, version: parseInt(e.target.value) || 1 })}
            />
          </div>

          <Input
            label="Asset URL (CDN) *"
            value={newAsset.url}
            onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
            placeholder="https://cdn.viora.com/assets/item.png"
          />
          
          {!isValidUrl(newAsset.url) && newAsset.url && (
            <p className="text-xs text-red-500">⚠️ Invalid URL! Must start with https:// or http://</p>
          )}

          <Button 
            size="sm" 
            onClick={handleAdd} 
            disabled={!isValidUrl(newAsset.url)}
          >
            Add Asset
          </Button>
        </div>
      )}

      {assets.length > 0 ? (
        <div className="space-y-2">
          {assets.map((asset, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border">
              <Image className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">{asset.kind}</span>
              <span className="text-xs text-gray-500">• {asset.purpose}</span>
              <span className="text-xs text-gray-400">• {asset.platform}</span>
              <span className="text-xs text-gray-400 flex-1 truncate">{asset.url}</span>
              <button onClick={() => handleRemove(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Add at least one CDN asset URL</p>
      )}
    </div>
  );
}
