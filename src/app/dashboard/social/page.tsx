'use client';

import { useState, useCallback } from 'react';
import { Users, UserMinus, ShieldOff } from 'lucide-react';
import { useFriends, useSocialBlockUser, useSocialUnblockUser, useSocialMuteUser } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';

interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'friends' | 'pending' | 'blocked';
  createdAt: string;
  friend?: {
    id: string;
    nickname: string;
    avatar?: string;
    status?: string;
  };
}

export default function SocialPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'friends' | 'blocked' | 'muted'>('friends');

  const { data: friends = [], isLoading, error, refetch } = useFriends();
  
  const blockMutation = useSocialBlockUser();
  const unblockMutation = useSocialUnblockUser();
  const muteMutation = useSocialMuteUser();

  const handleBlockUser = useCallback(async (userId: string) => {
    try {
      await blockMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  }, [blockMutation]);

  const handleUnblockUser = useCallback(async (userId: string) => {
    try {
      await unblockMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  }, [unblockMutation]);

  const handleMuteUser = useCallback(async (userId: string) => {
    try {
      await muteMutation.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to mute user:', error);
    }
  }, [muteMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('social')}</h1>
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

  const filteredFriends = friends.filter(f => {
    if (activeTab === 'friends') return f.status === 'friends';
    if (activeTab === 'blocked') return f.status === 'blocked';
    return false;
  });

  const columns: Column<Friend>[] = [
    {
      key: 'nickname',
      header: t('username'),
      render: (friend) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
            {friend.friend?.nickname?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            {friend.friend?.nickname || 'Unknown'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (friend) => (
        <Badge variant={
          friend.friend?.status === 'online' ? 'success' : 
          friend.status === 'blocked' ? 'danger' : 'default'
        }>
          {friend.friend?.status || friend.status}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: t('date'),
      render: (friend) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(friend.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'w-32',
      render: (friend) => (
        <div className="flex gap-1">
          {activeTab === 'friends' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMuteUser(friend.friendId)}
                disabled={muteMutation.isPending}
                title={t('mute')}
              >
                <ShieldOff className="w-4 h-4" />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleBlockUser(friend.friendId)}
                disabled={blockMutation.isPending}
                title={t('block')}
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            </>
          )}
          {activeTab === 'blocked' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblockUser(friend.friendId)}
              disabled={unblockMutation.isPending}
            >
              {t('unblock')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('social')}</h1>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          {t('friends')}
          {activeTab === 'friends' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('blocked')}
          className={`px-4 py-2 text-sm font-semibold transition-all relative ${
            activeTab === 'blocked' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShieldOff className="w-4 h-4 inline mr-2" />
          {t('blocked')}
          {activeTab === 'blocked' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
        </button>
      </div>

      <Card>
        <CardContent>
          <DataTable
            data={filteredFriends}
            columns={columns}
            emptyMessage={t('noData')}
          />
        </CardContent>
      </Card>
    </div>
  );
}