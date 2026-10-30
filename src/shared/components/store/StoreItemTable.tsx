'use client';

import { Package, Coins, ImageIcon } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { formatIntegerString } from '@/shared/lib/money';
import type { StoreItem } from '@/services/store.service';
import { storeItemTypeLabel, storeItemSlotLabel } from '@/shared/lib/store-item-types';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
};

// `slot` is a closed backend vocabulary (STORE_ITEM_SLOTS), rendered through
// its label map with a raw-value fallback for pre-enum rows.

interface StoreItemTableProps {
  items: StoreItem[];
  isRTL?: boolean;
  onRowClick?: (item: StoreItem) => void;
}

export function StoreItemTable({ items, isRTL, onRowClick }: StoreItemTableProps) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slot</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rarity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assets</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((item) => {
              const preview =
                item.assets?.find((a) => a.purpose === 'icon' && a.url) ??
                item.assets?.find((a) => Boolean(a.url)) ??
                null;
              const title = item.title?.[isRTL ? 'ar' : 'en'] || item.title?.en || 'Unnamed';

              return (
              <tr
                key={item.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => onRowClick?.(item)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                      {preview?.url ? (
                        <MediaPreview url={preview.url} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{title}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{item.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{storeItemTypeLabel(item.type)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400" title={item.slot}>{storeItemSlotLabel(item.slot)}</td>
                <td className="px-4 py-3">
                  <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{item.scope}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${rarityColors[item.rarity]}`}>{item.rarity}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {item.priceGameCurrency != null ? (
                      <div className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm font-medium">{formatIntegerString(item.priceGameCurrency)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Free</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <ImageIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {item.assets?.length ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? 'success' : 'default'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}