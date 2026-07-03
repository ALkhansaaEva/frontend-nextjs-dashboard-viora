'use client';

import { Gift, Coins, Gem } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import type { GiftCatalogEntry } from '@/services/gifts.service';

interface GiftCardProps {
  entry: GiftCatalogEntry;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function GiftCard({ entry, canManage, onEdit, onDelete }: GiftCardProps) {
  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      <div className="aspect-square bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden flex items-center justify-center">
        {entry.icon ? (
          <img src={entry.icon} alt="" className="w-full h-full object-contain p-4" />
        ) : (
          <Gift className="w-16 h-16 text-pink-300 dark:text-gray-600 group-hover:scale-110 transition-transform" />
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate">{entry.titleI18n?.en || entry.code}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{entry.code}</p>

        <div className="flex items-center gap-2 mt-2">
          {entry.priceCoins > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
              <Coins className="w-3 h-3" /> {entry.priceCoins}
            </span>
          )}
          {entry.priceGems > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-purple-500">
              <Gem className="w-3 h-3" /> {entry.priceGems}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Badge variant={entry.isActive ? 'success' : 'danger'}>
            {entry.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-xs text-gray-400">
            {entry.stock > 0 ? `${entry.stock} in stock` : '∞'}
          </span>
        </div>

        {canManage && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <ActionButtons onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GiftCard;
