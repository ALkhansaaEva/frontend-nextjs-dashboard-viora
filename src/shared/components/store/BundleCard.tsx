'use client';

import { Coins, Eye, Package } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { formatIntegerString } from '@/shared/lib/money';
import type { StoreBundle, StoreBundleItem } from '@/services/store.service';

/** ponytail: the admin bundle list may or may not hydrate `items[].item`
 * (it is optional on both `StoreBundle` and `StoreBundleItem`). Only render a
 * line's name/code when the item is actually loaded; otherwise show the raw
 * reference so nothing is ever invented. */
function bundleLineLabel(line: StoreBundleItem): string {
  return line.item?.title?.en || line.item?.code || `${line.itemId.slice(0, 8)}…`;
}

interface BundleCardProps {
  bundle: StoreBundle;
  isRTL?: boolean;
  onView?: (bundle: StoreBundle) => void;
}

const PREVIEW_LIMIT = 3;

export function BundleCard({ bundle, isRTL, onView }: BundleCardProps) {
  const lines = bundle.items ?? [];
  const preview = lines.slice(0, PREVIEW_LIMIT);
  const overflow = lines.length - preview.length;

  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      {/* StoreBundle has no icon field on the backend — this header is
          deliberately a fixed gradient + glyph, never an <img>. */}
      <div className="h-24 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
        <span className="text-4xl" aria-hidden="true">📦</span>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start gap-2 mb-3">
          <h3 className="text-lg font-bold truncate">{bundle.title?.[isRTL ? 'ar' : 'en'] || bundle.title?.en || 'Bundle'}</h3>
          <Badge variant={bundle.isActive ? 'success' : 'default'}>
            {bundle.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 font-mono truncate mb-2">{bundle.sku}</p>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-6 h-6 text-emerald-500 shrink-0" />
          <span className="text-3xl font-bold">{formatIntegerString(bundle.priceGameCurrency)}</span>
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-500">{lines.length} item{lines.length === 1 ? '' : 's'} included</p>
          {preview.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {preview.map((line) => (
                <li key={line.id} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                  <Package className="w-3 h-3 shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="truncate">{bundleLineLabel(line)}</span>
                  <span className="shrink-0 text-gray-400">×{line.quantity}</span>
                </li>
              ))}
              {overflow > 0 && <li className="text-xs text-gray-400 pl-[18px]">+{overflow} more</li>}
            </ul>
          )}
        </div>

        <Button size="sm" variant="outline" onClick={() => onView?.(bundle)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> View
        </Button>
      </CardContent>
    </Card>
  );
}
