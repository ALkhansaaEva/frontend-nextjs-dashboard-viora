'use client';

import { Gift, Coins, Clock } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import { formatIntegerString } from '@/shared/lib/money';
import type { GiftCatalogEntry } from '@/services/gifts.service';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

interface GiftCardProps {
  entry: GiftCatalogEntry;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function capitalize(value?: string): string {
  return value ? value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '';
}

function day(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function GiftCard({ entry, canManage, onEdit, onDelete }: GiftCardProps) {
  const availability = [day(entry.startsAt), day(entry.endsAt)].filter(Boolean).join(' – ');

  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      {/* 4:5 portrait gives the icon more presence than the old square crop
          without changing the grid or the toggle that renders it. */}
      <div className="aspect-[4/5] bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden flex items-center justify-center">
        {entry.icon ? (
          <MediaPreview
            url={entry.icon}
            className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Gift className="w-16 h-16 text-pink-300 dark:text-gray-600 group-hover:scale-110 transition-transform" />
        )}
        <span
          aria-hidden
          title={entry.isActive ? 'Active' : 'Inactive'}
          className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-900 ${
            entry.isActive ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        />
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate" title={entry.titleI18n?.en || entry.code}>
          {entry.titleI18n?.en || entry.code}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {entry.priceGameCurrency != null ? (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
              <Coins className="w-3 h-3" />
              {formatIntegerString(entry.priceGameCurrency)}
            </span>
          ) : (
            <span className="italic">Free</span>
          )}
        </p>

        {(entry.category || entry.rarity) && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {entry.category && <Badge variant="default" className="text-[10px] py-0">{capitalize(entry.category)}</Badge>}
            {entry.rarity && <Badge variant="outline" className="text-[10px] py-0">{capitalize(entry.rarity)}</Badge>}
          </div>
        )}

        {availability && (
          <p
            className="flex items-center gap-1 text-[11px] text-gray-400 mt-2"
            title={`${entry.startsAt ?? ''} → ${entry.endsAt ?? ''}`}
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span className="truncate">{availability}</span>
          </p>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Badge variant={entry.isActive ? 'success' : 'danger'}>
            {entry.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-[10px] font-mono text-gray-400 uppercase">{entry.contextType}</span>
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
