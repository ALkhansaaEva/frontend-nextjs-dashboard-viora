'use client';

import { Package, Coins, Volume2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { formatIntegerString } from '@/shared/lib/money';
import type { StoreItem } from '@/services/store.service';
import { storeItemTypeLabel } from '@/shared/lib/store-item-types';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

// Matches the backend canonical item types (see @/dto/store's ITEM_TYPES).

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
};

const kindIcons: Record<string, string> = {
  image: '🖼️', animated_webp: '🎞️', lottie: '🎬', rive: '🎭',
  audio: '🎵', spritesheet: '🗂️', svg: '📐',
};

const AUDIO_PURPOSES = ['sfx_roll', 'sfx_move', 'sfx_win', 'sfx_land', 'sfx_capture', 'sfx_click', 'sfx_ambient', 'audio'];

function isAudio(kind: string, purpose: string): boolean {
  return kind === 'audio' || AUDIO_PURPOSES.includes(purpose);
}

function AssetPreview({ url, kind, purpose }: { url: string; kind: string; purpose: string }) {
  // Audio keeps a real <audio controls> player: the dashboard genuinely plays
  // sfx/music assets, so that is the one case where a native element beats a
  // placeholder. Everything visual goes through the shared renderer, which
  // knows how to show animated raster, video and SVG, and labels the
  // player-driven formats (lottie/rive/svga) instead of faking a still.
  if (isAudio(kind, purpose)) {
    return (
      <div className="relative group">
        <audio controls className="w-full h-10 rounded" preload="none">
          <source src={url} />
        </audio>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded overflow-hidden flex items-center justify-center">
      <MediaPreview url={url} showFormatHint className="w-full h-full object-contain" />
      <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 bg-black/60 text-white rounded">
        {kind}
      </span>
    </div>
  );
}

export function ItemDetailContent({
  item, canManage, onEdit, onDelete
}: {
  item: StoreItem; canManage: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const iconAsset = item.assets?.find(a => a.purpose === 'icon');
  const mainAsset = iconAsset || item.assets?.[0];
  const imageAssets = item.assets?.filter(a => !isAudio(a.kind, a.purpose)) || [];
  const audioAssets = item.assets?.filter(a => isAudio(a.kind, a.purpose)) || [];

  return (
    <div className="space-y-5">
      {/* Header with image */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <div className="w-20 h-20 shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl overflow-hidden flex items-center justify-center">
          {!mainAsset && <Package className="w-10 h-10 text-gray-400" />}
          <MediaPreview
            url={mainAsset?.url}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${rarityColors[item.rarity]}`}>{item.rarity}</span>
            {item.isStackable && <Badge variant="outline" className="text-xs">Stackable</Badge>}
          </div>
          <h3 className="text-xl font-bold truncate">{item.title?.en}</h3>
          <p className="text-sm text-gray-500 font-mono truncate">{item.code}</p>
        </div>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Type</p>
          <p className="font-medium">{storeItemTypeLabel(item.type)}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Slot</p>
          <p className="font-medium">{storeItemTypeLabel(item.slot)}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Scope</p>
          <p className="font-medium capitalize">{item.scope}</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Expiry</p>
          <p className="font-medium">{(item.defaultExpiryHours ?? 0) > 0 ? `${item.defaultExpiryHours}h` : 'Permanent'}</p>
        </div>
      </div>

      {/* Pricing */}
      <div className="flex flex-wrap items-center gap-3">
        {item.priceGameCurrency != null ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <Coins className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatIntegerString(item.priceGameCurrency)}</span>
            <span className="text-sm text-emerald-600 dark:text-emerald-400">GAME_CURRENCY</span>
          </div>
        ) : (
          <Badge variant="success">Free</Badge>
        )}
        <Badge variant={item.isActive ? 'success' : 'default'} className="ml-auto">
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Assets section */}
      {item.assets && item.assets.length > 0 && (
        <div className="pt-3 border-t">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Assets ({item.assets.length})
          </h4>

          {/* Image/Visual assets grid */}
          {imageAssets.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-3">
              {imageAssets.map((asset) => (
                <div key={asset.id} className="group">
                  <AssetPreview url={asset.url} kind={asset.kind} purpose={asset.purpose} />
                  <p className="text-[10px] text-gray-500 mt-1 text-center truncate">
                    {kindIcons[asset.kind] || '📄'} {asset.purpose}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Audio assets */}
          {audioAssets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <Volume2 className="w-3 h-3" /> Audio
              </p>
              {audioAssets.map((asset) => (
                <div key={asset.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <Volume2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 w-16 truncate">{asset.purpose}</span>
                  <div className="flex-1">
                    <AssetPreview url={asset.url} kind={asset.kind} purpose={asset.purpose} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Asset list with details */}
          <div className="mt-3 space-y-1">
            {item.assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-2 text-xs text-gray-500 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded">
                <span className="font-mono text-[10px] text-gray-400 w-16 truncate">{asset.kind}</span>
                <span className="w-16 truncate">{asset.purpose}</span>
                <span className="text-[10px] text-gray-400">{asset.platform}</span>
                <span className="text-[10px] text-gray-400 ml-auto">v{asset.version}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="flex gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onEdit} className="flex-1">
            Edit
          </Button>
          <Button variant="outline" onClick={onDelete} className="flex-1 text-red-500 border-red-200 hover:bg-red-50">
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
