'use client';

import { storeItemImageUrl } from '@/shared/lib/media-url';
import { Package, Coins, Sparkles, Pencil, Eye, Trash2, ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { formatIntegerString } from '@/shared/lib/money';
import type { StoreItem } from '@/services/store.service';
import { storeItemTypeLabel } from '@/shared/lib/store-item-types';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
};

/** Solid variants of `rarityColors` for the image's bottom accent bar. */
const rarityBarColors: Record<string, string> = {
  common: 'bg-gray-300 dark:bg-gray-600',
  rare: 'bg-blue-400 dark:bg-blue-600',
  epic: 'bg-purple-400 dark:bg-purple-600',
  legendary: 'bg-amber-400 dark:bg-amber-600'
};

/** Mirrors @/dto/store ITEM_TYPES; `slot` has no backend enum and is not here. */

interface StoreItemCardProps {
  item: StoreItem;
  isRTL?: boolean;
  canManage?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StoreItemCard({ item, isRTL, canManage, onClick, onEdit, onDelete }: StoreItemCardProps) {
  // `icon` is preferred, then the other display purposes, then any asset that
  // carries a URL — resolved through the shared helper so Store, Gift and
  // Badge all honour the same proxy/absolute-URL rule.
  const itemImage = storeItemImageUrl(item.assets);
  const title = item.title?.[isRTL ? 'ar' : 'en'] || item.title?.en || item.code;

  return (
    <Card className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group" onClick={onClick}>
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
        {itemImage ? (
          /* Animated GIF/WebP animate natively; nothing in the delivery path
             flattens them. On a decode failure this shows the same Package
             glyph the no-media branch uses. */
          <div className="absolute inset-0">
            <MediaPreview url={itemImage} alt={title} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform" aria-hidden="true" />
          </div>
        )}
        {item.rarity === 'legendary' && (
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-amber-500" aria-label="Legendary rarity" />
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${rarityBarColors[item.rarity] ?? 'bg-gray-400'}`} />
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate" title={title}>{title}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{item.code}</p>

        <div className="flex flex-wrap items-center gap-1 mt-2">
          <Badge variant="outline">{storeItemTypeLabel(item.type)}</Badge>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rarityColors[item.rarity]}`}>
            {item.rarity}
          </span>
          <Badge variant={item.isActive ? 'success' : 'default'}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1 min-w-0">
            {item.priceGameCurrency != null ? (
              <div className="flex items-center gap-0.5">
                <Coins className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden="true" />
                <span className="text-xs font-medium truncate">{formatIntegerString(item.priceGameCurrency)}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Free</span>
            )}
          </div>
          <span className="flex items-center gap-0.5 text-[10px] text-gray-400 shrink-0">
            <ImageIcon className="w-3 h-3" aria-hidden="true" />
            {item.assets?.length ?? 0}
          </span>
        </div>

        {canManage && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              aria-label={`Edit ${title}`}
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label={`View ${title}`}
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${title}`}
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
