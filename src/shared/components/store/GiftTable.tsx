'use client';

import { Gift } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import type { GiftCatalogEntry } from '@/services/gifts.service';

interface GiftTableProps {
  entries: GiftCatalogEntry[];
  canManage?: boolean;
  onEdit?: (entry: GiftCatalogEntry) => void;
  onDelete?: (id: string) => void;
  onView?: (entry: GiftCatalogEntry) => void;
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
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gold</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gems</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
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
                        <img src={entry.icon} alt="" className="w-8 h-8 object-contain" />
                      ) : (
                        <Gift className="w-5 h-5 text-pink-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{entry.titleI18n?.en || entry.code}</p>
                      {entry.descriptionI18n?.en && (
                        <p className="text-xs text-gray-400 line-clamp-1">{entry.descriptionI18n.en}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{entry.code}</td>
                <td className="px-4 py-3 text-sm">{entry.priceCoins > 0 ? entry.priceCoins : '—'}</td>
                <td className="px-4 py-3 text-sm">{entry.priceGems > 0 ? entry.priceGems : '—'}</td>
                <td className="px-4 py-3 text-sm">{entry.stock > 0 ? entry.stock : '∞'}</td>
                <td className="px-4 py-3">
                  <Badge variant={entry.isActive ? 'success' : 'danger'}>
                    {entry.isActive ? 'Active' : 'Inactive'}
                  </Badge>
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
