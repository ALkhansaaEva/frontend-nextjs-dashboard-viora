'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, AlertTriangle } from 'lucide-react';
import { useLeaderboard } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Select } from '@/shared/components/ui/Select';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { UserIdentityCell } from '@/shared/components/ui/UserIdentityCell';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import type { LeaderboardEntry } from '@/services/meta-game.service';

const GAME_TYPES = [
  { value: 'ludo', label: 'Ludo' },
  { value: 'domino', label: 'Domino' },
];

/**
 * Meta-Game / Rankings — meta-game/ranking/:gameType/leaderboard
 * (modules/meta-game/meta-game.controller.ts). This page used to also show
 * "Daily Login" and "Tasks" tabs that called `/meta-game/daily-login` and
 * `/meta-game/tasks` — neither route exists anywhere on the backend (a full
 * controller sweep confirmed it), so those tabs always 404'd. Removed rather
 * than shipped broken. "Tasks" as a real backend feature lives under
 * RuleAdminController (kind=TASK) at /dashboard/meta/tasks — a completely
 * different route and data model from what this page used to fake.
 */
export default function MetaGamePage() {
  const { t } = useLanguage();
  const [gameType, setGameType] = useState('ludo');
  const {
    data: leaderboard = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useLeaderboard(gameType);

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
        <span className="font-mono text-sm text-gray-900 dark:text-white">
          <UserIdentityCell userId={entry.userId} />
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (entry) => (
        <span className="font-semibold">{entry.tier}</span>
      ),
    },
    {
      key: 'currentRating',
      header: 'Rating',
      render: (entry) => entry.currentRating.toLocaleString(),
    },
    {
      key: 'record',
      header: 'Record',
      render: (entry) => `${entry.wins}-${entry.losses}-${entry.draws}`,
    },
    {
      key: 'winRate',
      header: 'Win rate',
      render: (entry) => `${(entry.winRate * 100).toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('metaGame')}</h1>
        <Select value={gameType} onChange={(e) => setGameType(e.target.value)} options={GAME_TYPES} className="w-40" />
      </div>

      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 flex gap-3 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This page previously showed Daily Login and Task-claim tabs that called backend routes which do not
          exist (<code>/meta-game/daily-login</code>, <code>/meta-game/tasks</code>) — removed. Task management
          lives at <Link href="/dashboard/meta/tasks" className="underline">Tasks</Link> (backed by the real Rule Engine).
        </p>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        Competitive rating is authoritative per game type. It is separate from manually assigned system badges,
        room ranks, room-member progression, and room roles.
      </p>

      {isError && <QueryErrorNotice error={error} onRetry={() => refetch()} />}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !isError ? (
            <DataTable
              data={leaderboard}
              columns={leaderboardColumns}
              emptyMessage={t('noLeaderboard')}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
