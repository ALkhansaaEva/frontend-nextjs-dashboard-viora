'use client';

import { useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gamepad2, Users, Trophy, Eye, MessageSquare, Plus, LogIn } from 'lucide-react';
import { useMatches, useMatch, useMatchChat, useCreatePrivateMatch, useJoinMatchByCode } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';

interface Match {
  id: string;
  gameType: string;
  status: 'waiting' | 'playing' | 'finished';
  players: MatchPlayer[];
  winnerId?: string;
  roomCode?: string;
  createdAt: string;
  updatedAt: string;
}

interface MatchPlayer {
  userId: string;
  position: number;
  score?: number;
  isFinished: boolean;
  finishedAt?: string;
  user?: {
    id: string;
    nickname: string;
    avatar?: string;
  };
}

export default function MatchesPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const gameType = searchParams.get('gameType') || '';

  const { data, isLoading, error, refetch } = useMatches({
    page,
    limit: 20,
    gameType: gameType || undefined,
  });

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const { data: matchDetail } = useMatch(selectedMatchId || '');
  const { data: chatMessages = [] } = useMatchChat(selectedMatchId || '', 50);

  const createMatchMutation = useCreatePrivateMatch();
  const joinByCodeMutation = useJoinMatchByCode();

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const handleViewMatch = useCallback((match: Match) => {
    setSelectedMatchId(match.id);
    setShowDetailsModal(true);
  }, []);

  const handleCreateMatch = useCallback(async () => {
    try {
      const result = await createMatchMutation.mutateAsync();
      setShowCreateModal(false);
      setSelectedMatchId(result.id);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to create match:', error);
    }
  }, [createMatchMutation]);

  const handleJoinByCode = useCallback(async () => {
    if (!joinCode.trim()) return;
    try {
      const result = await joinByCodeMutation.mutateAsync(joinCode.trim());
      setShowCreateModal(false);
      setJoinCode('');
      setSelectedMatchId(result.id);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Failed to join match:', error);
    }
  }, [joinCode, joinByCodeMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('matches')}</h1>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{t('error')}</p>
        <Button onClick={() => refetch()}>{t('retry')}</Button>
      </div>
    );
  }

  const columns: Column<Match>[] = [
    {
      key: 'gameType',
      header: t('gameType'),
      render: (match) => (
        <Badge variant="outline">{match.gameType}</Badge>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (match) => (
        <Badge
          variant={
            match.status === 'finished' ? 'default' :
            match.status === 'playing' ? 'success' : 'warning'
          }
        >
          {match.status}
        </Badge>
      ),
    },
    {
      key: 'players',
      header: t('players'),
      render: (match) => (
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-gray-500" />
          <span>{match.players?.length || 0}</span>
        </div>
      ),
    },
    {
      key: 'winner',
      header: t('winner'),
      render: (match) => (
        <span className="text-gray-600 dark:text-gray-400">
          {match.winnerId ? match.winnerId.slice(0, 8) + '...' : '-'}
        </span>
      ),
    },
    {
      key: 'roomCode',
      header: t('roomCode'),
      render: (match) => (
        <span className="font-mono text-sm">{match.roomCode || '-'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: t('date'),
      render: (match) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(match.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'w-20',
      render: (match) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewMatch(match)}
          className="gap-1.5"
        >
          <Eye className="w-4 h-4" />
          {t('view')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('matches')}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            {t('joinByCode')}
          </Button>
          <Button onClick={handleCreateMatch} disabled={createMatchMutation.isPending} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('createMatch')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            {t('matchHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.data || []}
            columns={columns}
            pagination={
              data && {
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: handlePageChange,
              }
            }
            emptyMessage={t('noMatches')}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedMatchId(null);
        }}
        title={t('matchDetails')}
        size="lg"
      >
        {matchDetail && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Badge variant="outline">{matchDetail.gameType}</Badge>
              <Badge variant={matchDetail.status === 'finished' ? 'default' : 'success'}>
                {matchDetail.status}
              </Badge>
              {matchDetail.roomCode && (
                <span className="font-mono text-sm">Code: {matchDetail.roomCode}</span>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">{t('players')}</h4>
              <div className="space-y-2">
                {matchDetail.players?.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {player.position + 1}
                      </div>
                      <div>
                        <p className="font-medium">{player.user?.nickname || player.userId.slice(0, 8)}</p>
                        {player.score !== undefined && (
                          <p className="text-xs text-gray-500">Score: {player.score}</p>
                        )}
                      </div>
                    </div>
                    {player.isFinished && (
                      <Badge variant="success">Finished</Badge>
                    )}
                    {matchDetail.winnerId === player.userId && (
                      <Trophy className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {chatMessages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t('chat')}
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                      <span className="font-medium">{msg.senderId.slice(0, 8)}:</span>{' '}
                      <span>{msg.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('createOrJoinMatch')}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <Input
              label={t('roomCode')}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder={t('enterRoomCode')}
            />
            <Button
              className="w-full"
              onClick={handleJoinByCode}
              disabled={!joinCode.trim() || joinByCodeMutation.isPending}
            >
              {joinByCodeMutation.isPending ? t('joining') : t('joinMatch')}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">{t('or')}</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCreateMatch}
            disabled={createMatchMutation.isPending}
          >
            {createMatchMutation.isPending ? t('creating') : t('createNewMatch')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}