'use client';

import { Trophy, Coins, Gem, Zap, EyeOff } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import type { Achievement } from '@/services/achievements.service';

const rarityVariants: Record<string, string> = {
  common: 'default',
  rare: 'info',
  epic: 'warning',
  legendary: 'success',
};

interface AchievementTableProps {
  achievements: Achievement[];
  canManage?: boolean;
  onEdit?: (a: Achievement) => void;
  onDelete?: (id: string) => void;
  onView?: (a: Achievement) => void;
}

export function AchievementTable({ achievements, canManage, onEdit, onDelete, onView }: AchievementTableProps) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Achievement</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rarity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Criteria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Target</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rewards</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {achievements.map((a) => (
              <tr
                key={a.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                onClick={() => onView?.(a)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                      {a.iconUrl ? (
                        <img src={a.iconUrl} alt="" className="w-8 h-8 object-contain" />
                      ) : (
                        <Trophy className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{a.title?.en || a.title?.ar || a.code}</p>
                      {a.description?.en && (
                        <p className="text-xs text-gray-400 line-clamp-1">{a.description.en}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{a.code}</td>
                <td className="px-4 py-3">
                  <Badge variant={rarityVariants[a.rarity] as any}>{a.rarity}</Badge>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {a.criteria.type.replace(/_/g, ' ')}
                  {a.criteria.gameType && <Badge variant="default" className="ml-1">{a.criteria.gameType}</Badge>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{a.criteria.target}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs">
                    {a.rewards.gold ? <span className="flex items-center gap-0.5 text-yellow-600"><Coins className="w-3 h-3" />{a.rewards.gold}</span> : null}
                    {a.rewards.gems ? <span className="flex items-center gap-0.5 text-blue-500"><Gem className="w-3 h-3" />{a.rewards.gems}</span> : null}
                    {a.rewards.xp ? <span className="flex items-center gap-0.5 text-purple-500"><Zap className="w-3 h-3" />{a.rewards.xp}</span> : null}
                    {!a.rewards.gold && !a.rewards.gems && !a.rewards.xp && <span className="text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Badge variant={a.isActive ? 'success' : 'danger'}>
                      {a.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {a.isHidden && <EyeOff className="w-3 h-3 text-gray-400" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    onEdit={() => onEdit?.(a)}
                    onDelete={() => onDelete?.(a.id)}
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

export default AchievementTable;
