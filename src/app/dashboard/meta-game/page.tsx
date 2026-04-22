'use client';

import { useState } from 'react';
import { Gift, Trophy, Flame, Target } from 'lucide-react';
import { useDailyLogin, useClaimDailyLogin, useTasks, useClaimTask, useLeaderboard } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  progress: number;
  target: number;
  reward: {
    currency: 'gold' | 'gems';
    amount: number;
  };
  isCompleted: boolean;
  isClaimed: boolean;
  expiresAt?: string;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

export default function MetaGamePage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'daily' | 'tasks' | 'leaderboard'>('daily');

  const { data: dailyLogin, isLoading: dailyLoading } = useDailyLogin();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: leaderboard = [] } = useLeaderboard('ludo');

  const claimDailyMutation = useClaimDailyLogin();
  const claimTaskMutation = useClaimTask();

  const handleClaimDaily = async () => {
    try {
      await claimDailyMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    try {
      await claimTaskMutation.mutateAsync(taskId);
    } catch (error) {
      console.error('Failed to claim task reward:', error);
    }
  };

  const isLoading = dailyLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('metaGame')}</h1>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  const taskColumns: Column<Task>[] = [
    {
      key: 'title',
      header: t('task'),
      render: (task) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
          <p className="text-xs text-gray-500">{task.description}</p>
        </div>
      ),
    },
    {
      key: 'progress',
      header: t('progress'),
      render: (task) => (
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span>{task.progress}/{task.target}</span>
            <span>{Math.round((task.progress / task.target) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{ width: `${Math.min((task.progress / task.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'reward',
      header: t('reward'),
      render: (task) => (
        <Badge variant={task.reward.currency === 'gems' ? 'warning' : 'success'}>
          {task.reward.amount} {task.reward.currency}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (task) => (
        <Badge variant={task.isClaimed ? 'success' : task.isCompleted ? 'warning' : 'default'}>
          {task.isClaimed ? t('claimed') : task.isCompleted ? t('claimable') : t('inProgress')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      render: (task) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleClaimTask(task.id)}
          disabled={!task.isCompleted || task.isClaimed || claimTaskMutation.isPending}
        >
          {t('claim')}
        </Button>
      ),
    },
  ];

  const leaderboardColumns: Column<LeaderboardEntry>[] = [
    {
      key: 'rank',
      header: t('rank'),
      render: (entry) => (
        <div className="flex items-center gap-2">
          {entry.rank <= 3 ? (
            <Trophy className={`w-5 h-5 ${
              entry.rank === 1 ? 'text-yellow-500' :
              entry.rank === 2 ? 'text-gray-400' : 'text-amber-700'
            }`} />
          ) : (
            <span className="w-5 text-center">{entry.rank}</span>
          )}
        </div>
      ),
    },
    {
      key: 'nickname',
      header: t('player'),
      render: (entry) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {entry.user?.nickname || entry.userId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'score',
      header: t('score'),
      render: (entry) => (
        <span className="font-semibold">{entry.score.toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('metaGame')}</h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'daily' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Flame className="w-4 h-4 inline mr-2" />
          {t('dailyLogin')}
          {activeTab === 'daily' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'tasks' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Target className="w-4 h-4 inline mr-2" />
          {t('tasks')}
          {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'leaderboard' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy className="w-4 h-4 inline mr-2" />
          {t('leaderboard')}
          {activeTab === 'leaderboard' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
      </div>

      {activeTab === 'daily' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 rounded-2xl">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Login Streak</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {dailyLogin?.streak || 0} {t('days')}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleClaimDaily}
                disabled={!dailyLogin?.canClaim || claimDailyMutation.isPending}
                variant={dailyLogin?.canClaim ? 'primary' : 'outline'}
              >
                <Gift className="w-4 h-4 mr-2" />
                {dailyLogin?.canClaim ? t('claimReward') : t('claimNext')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'tasks' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={tasks}
              columns={taskColumns}
              emptyMessage={t('noTasks')}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'leaderboard' && (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              data={leaderboard}
              columns={leaderboardColumns}
              emptyMessage={t('noLeaderboard')}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}