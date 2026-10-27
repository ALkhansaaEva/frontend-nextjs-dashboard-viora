'use client';

import { Gift } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import { formatIntegerString } from '@/shared/lib/money';
import type { GiftCatalogEntry } from '@/services/gifts.service';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

interface GiftTableProps {
  entries: GiftCatalogEntry[];
  canManage?: boolean;
  onEdit?: (entry: GiftCatalogEntry) => void;
  onDelete?: (id: string) => void;
  onView?: (entry: GiftCatalogEntry) => void;
}

function capitalize(value?: string): string {
  return value ? value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '';
}

export function GiftTable({ entries, canManage, onEdit, onDelete, onView }: GiftTableProps) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gift</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">GAME_CURRENCY</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => onView?.(entry)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-700 dark:to-gray-600 rounded-lg flex items-center justify-center">
                      {entry.icon ? (
                        <MediaPreview url={entry.icon} className="w-8 h-8 object-contain" />
                      ) : (
                        <Gift className="w-5 h-5 text-pink-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{entry.titleI18n?.en || entry.code}</p>
                      {entry.descriptionI18n?.en && (
                        <p className="text-xs text-gray-400 line-clamp-1">{entry.descriptionI18n.en}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[10px] font-mono uppercase text-gray-400">{entry.contextType}</span>
                        {entry.category && <Badge variant="default" className="text-[10px] py-0">{capitalize(entry.category)}</Badge>}
                        {entry.rarity && <Badge variant="outline" className="text-[10px] py-0">{capitalize(entry.rarity)}</Badge>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{entry.code}</td>
                <td className="px-4 py-3 text-sm">{entry.priceGameCurrency != null ? formatIntegerString(entry.priceGameCurrency) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={entry.isActive ? 'success' : 'danger'}>
                      {entry.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {entry.isLimitedTime && (entry.startsAt || entry.endsAt) && (
                      <span className="text-[10px] font-mono text-gray-400">
                        {entry.startsAt ? new Date(entry.startsAt).toLocaleDateString() : '—'} → {entry.endsAt ? new Date(entry.endsAt).toLocaleDateString() : '—'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionButtons
                    onEdit={() => onEdit?.(entry)}
                    onDelete={() => onDelete?.(entry.id)}
                    canManage={canManage}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default GiftTable;
