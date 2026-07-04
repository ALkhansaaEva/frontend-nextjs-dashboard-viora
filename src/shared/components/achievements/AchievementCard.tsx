'use client';

import { useState } from 'react';
import { Trophy, Coins, Gem, Zap, Sparkles, EyeOff, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import type { Achievement } from '@/services/achievements.service';

interface AchievementCardProps {
  achievement: Achievement;
  canManage?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const rarityConfig: Record<string, { border: string; badge: 'default' | 'info' | 'warning' | 'success'; iconColor: string; bgGradient: string }> = {
  common:    { border: 'border-gray-200 dark:border-gray-600', badge: 'default',  iconColor: 'text-gray-400', bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700' },
  rare:      { border: 'border-blue-200 dark:border-blue-800',  badge: 'info',    iconColor: 'text-blue-500', bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30' },
  epic:      { border: 'border-purple-200 dark:border-purple-800', badge: 'warning', iconColor: 'text-purple-500', bgGradient: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30' },
  legendary: { border: 'border-amber-200 dark:border-amber-800', badge: 'success', iconColor: 'text-amber-500', bgGradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30' },
};

export function AchievementCard({ achievement, canManage, onEdit, onDelete }: AchievementCardProps) {
  const cfg = rarityConfig[achievement.rarity]! || rarityConfig.common;
  const [imgError, setImgError] = useState(false);

  return (
    <Card hover className={`border-t-2 ${cfg.border}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2 min-w-0">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center shrink-0`}>
              {achievement.iconUrl && !imgError ? (
                <img src={achievement.iconUrl} alt="" className="w-7 h-7 object-contain"
                  onError={() => setImgError(true)} />
              ) : (
                <Trophy className={`w-5 h-5 ${cfg.iconColor}`} />
              )}
            </div>
            <span className="truncate">{achievement.title?.en || achievement.title?.ar || achievement.code}</span>
          </CardTitle>
          <Badge variant={cfg.badge} className="shrink-0">{achievement.rarity}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <span className="font-mono">{achievement.code}</span>
          {achievement.isHidden && <EyeOff className="w-3 h-3 text-gray-400" />}
        </div>

        {achievement.description?.en && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">{achievement.description.en}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1 inline" />
            {achievement.criteria.type.replace(/_/g, ' ')}: {achievement.criteria.target}
          </Badge>
        </div>

        {(achievement.rewards.gold || achievement.rewards.gems || achievement.rewards.xp || achievement.rewards.itemCode) ? (
          <div className="flex flex-wrap items-center gap-2 text-xs border-t border-gray-100 dark:border-gray-700 pt-2 mb-2">
            {achievement.rewards.gold ? (
              <span className="flex items-center gap-0.5 text-yellow-600 dark:text-yellow-400">
                <Coins className="w-3.5 h-3.5" /> {achievement.rewards.gold.toLocaleString()}
              </span>
            ) : null}
            {achievement.rewards.gems ? (
              <span className="flex items-center gap-0.5 text-blue-500">
                <Gem className="w-3.5 h-3.5" /> {achievement.rewards.gems.toLocaleString()}
              </span>
            ) : null}
            {achievement.rewards.xp ? (
              <span className="flex items-center gap-0.5 text-purple-500">
                <Zap className="w-3.5 h-3.5" /> {achievement.rewards.xp.toLocaleString()} XP
              </span>
            ) : null}
            {achievement.rewards.itemCode ? (
              <span className="flex items-center gap-0.5 text-orange-500">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
            ) : null}
          </div>
        ) : (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mb-2" />
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <Badge variant={achievement.isActive ? 'success' : 'danger'} className="text-xs">
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
