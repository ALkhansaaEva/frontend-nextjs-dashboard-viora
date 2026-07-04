'use client';

import { useState } from 'react';
import { Trophy, Coins, Gem, Zap, Sparkles, EyeOff, Swords } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import type { Achievement } from '@/services/achievements.service';

interface AchievementCardProps {
  achievement: Achievement;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const rarityStyles: Record<string, { gradient: string; badge: string; label: string }> = {
  common: { gradient: 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600', badge: 'default', label: '⚪ Common' },
  rare: { gradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30', badge: 'info', label: '🔵 Rare' },
  epic: { gradient: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30', badge: 'warning', label: '🟣 Epic' },
  legendary: { gradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30', badge: 'success', label: '🟠 Legendary' },
};

export function AchievementCard({ achievement, canManage, onEdit, onDelete }: AchievementCardProps) {
  const style = (rarityStyles[achievement.rarity] || rarityStyles.common)!;
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      <div className={`aspect-square bg-gradient-to-br ${style.gradient} relative overflow-hidden flex items-center justify-center`}>
        {achievement.iconUrl && !imgError ? (
          <img src={achievement.iconUrl} alt="" className="w-full h-full object-contain p-4"
            onError={() => setImgError(true)} />
        ) : (
          <Trophy className={`w-16 h-16 ${achievement.rarity === 'legendary' ? 'text-amber-500' : achievement.rarity === 'epic' ? 'text-purple-500' : achievement.rarity === 'rare' ? 'text-blue-500' : 'text-gray-400'} group-hover:scale-110 transition-transform`} />
        )}
        {achievement.isHidden && (
          <div className="absolute top-2 right-2">
            <EyeOff className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate">{achievement.title?.en || achievement.title?.ar || achievement.code}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{achievement.code}</p>

        <div className="flex flex-wrap items-center gap-1 mt-2">
          <Badge variant={style.badge as any}>{style.label}</Badge>
          <Badge variant="outline">{achievement.criteria.type.replace(/_/g, ' ')}</Badge>
        </div>

        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Swords className="w-3 h-3" /> {achievement.criteria.target}
          </span>
        </div>

        {(achievement.rewards.gold || achievement.rewards.gems || achievement.rewards.xp || achievement.rewards.itemCode) && (
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {achievement.rewards.gold ? (
              <span className="flex items-center gap-0.5 text-xs text-yellow-600 dark:text-yellow-400">
                <Coins className="w-3 h-3" /> {achievement.rewards.gold}
              </span>
            ) : null}
            {achievement.rewards.gems ? (
              <span className="flex items-center gap-0.5 text-xs text-blue-500">
                <Gem className="w-3 h-3" /> {achievement.rewards.gems}
              </span>
            ) : null}
            {achievement.rewards.xp ? (
              <span className="flex items-center gap-0.5 text-xs text-purple-500">
                <Zap className="w-3 h-3" /> {achievement.rewards.xp} XP
              </span>
            ) : null}
            {achievement.rewards.itemCode ? (
              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                <Sparkles className="w-3 h-3" />
              </span>
            ) : null}
          </div>
        )}

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Badge variant={achievement.isActive ? 'success' : 'danger'}>
            {achievement.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {canManage && (
            <ActionButtons onEdit={onEdit} onDelete={onDelete} canManage={canManage} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AchievementCard;
