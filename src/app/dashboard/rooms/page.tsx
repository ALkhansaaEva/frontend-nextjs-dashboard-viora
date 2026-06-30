'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useRooms, useRoom, useRoomMembers, useRoomBans, useRoomMutes, useRoomKicks, useKickUser, useBanUser, useUnbanUser, useMuteUser, useUnmuteUser, useHasPermission } from '@/hooks';
import { useLanguage } from '@/components/language-context';
import { TableSkeleton } from '@/components/skeletons';
import { DataTable, type Column } from '@/shared/components/ui/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { Users, Shield, MicOff, UserX } from 'lucide-react';

interface Room {
  id: string;
  roomCode: string;
  name: Record<string, string>;
  level: number;
  updatedAt: string;
  memberCount?: number;
  isActive?: boolean;
}

export default function RoomsPage() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const search = searchParams.get('search') || '';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'moderation'>('members');

  const canManageRooms = useHasPermission()('manage_all_rooms');
  const { data, isLoading, error, refetch } = useRooms({ page, limit: 20, admin: canManageRooms });

  const { data: roomDetail } = useRoom(selectedRoomId || '', canManageRooms);
  const { data: members = [] } = useRoomMembers(selectedRoomId || '');
  const { data: bans = [] } = useRoomBans(selectedRoomId || '');
  const { data: mutes = [] } = useRoomMutes(selectedRoomId || '');
  const { data: kicks = [] } = useRoomKicks(selectedRoomId || '');

  const kickMutation = useKickUser();
  const banMutation = useBanUser();
  const unbanMutation = useUnbanUser();
  const muteMutation = useMuteUser();
  const unmuteMutation = useUnmuteUser();

  const filteredRooms = useMemo(() => {
    if (!data?.data) return [];
    if (!search) return data.data;
    const searchLower = search.toLowerCase();
    return data.data.filter(
      (room) =>
        room.name?.en?.toLowerCase().includes(searchLower) ||
        room.name?.ar?.toLowerCase().includes(searchLower) ||
        room.roomCode.toLowerCase().includes(searchLower)
    );
  }, [data?.data, search]);

  const handleSearch = useCallback((query: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('search', query);
    window.history.pushState({}, '', url);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    const url = new URL(window.location.href);
    url.searchParams.set('page', newPage.toString());
    window.history.pushState({}, '', url);
  }, []);

  const handleViewRoom = useCallback((room: Room) => {
    setSelectedRoomId(room.id);
    setShowDetailsModal(true);
  }, []);

  const handleModerationAction = useCallback(
    async (action: 'kick' | 'ban' | 'unban' | 'mute' | 'unmute', targetUserId: string) => {
      if (!selectedRoomId) return;
      const mutationMap = {
        kick: kickMutation,
        ban: banMutation,
        unban: unbanMutation,
        mute: muteMutation,
        unmute: unmuteMutation,
      };
      try {
        await mutationMap[action].mutateAsync({ roomId: selectedRoomId, userId: targetUserId });
      } catch (error) {
        console.error(`Failed to ${action} user:`, error);
      }
    },
    [selectedRoomId, kickMutation, banMutation, unbanMutation, muteMutation, unmuteMutation]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Rooms</h1>
        <TableSkeleton rows={8} />
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

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: 'Room Name',
      render: (room) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {room.name?.en || room.name?.ar || 'Unnamed Room'}
        </span>
      ),
    },
    {
      key: 'roomCode',
      header: 'Code',
      render: (room) => <Badge variant="default">{room.roomCode}</Badge>,
    },
    {
      key: 'level',
      header: 'Level',
      render: (room) => <span className="text-gray-600 dark:text-gray-400">{room.level}</span>,
    },
    {
      key: 'memberCount',
      header: 'Members',
      render: (room) => (
        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Users className="w-4 h-4" />
          {room.memberCount || 0}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Created',
      render: (room) => (
        <span className="text-gray-600 dark:text-gray-400">
          {new Date(room.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-20',
      render: (room) => (
        <Button variant="ghost" size="sm" onClick={() => handleViewRoom(room)} className="gap-1.5">
          <Eye className="w-4 h-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Rooms</h1>

      <DataTable
        data={filteredRooms}
        columns={columns}
        searchable
        searchPlaceholder="Search rooms..."
        onSearch={handleSearch}
        pagination={
          data && {
            page: data.page,
            limit: data.limit,
            total: data.total,
            totalPages: data.totalPages,
            onPageChange: handlePageChange,
          }
        }
        emptyMessage="No rooms found"
      />

      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRoomId(null);
          setActiveTab('members');
        }}
        title={roomDetail?.name?.en || roomDetail?.name?.ar || 'Room Details'}
        size="xl"
      >
        {selectedRoomId && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Badge variant="default">{roomDetail?.roomCode}</Badge>
              <span className="text-sm text-gray-500">Level {roomDetail?.level}</span>
              <span className="text-sm text-gray-500">
                <Users className="w-4 h-4 inline mr-1" />
                {members.length} members
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant={activeTab === 'members' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('members')}
              >
                Members ({members.length})
              </Button>
              <Button
                variant={activeTab === 'moderation' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('moderation')}
              >
                Moderation
              </Button>
            </div>

            {activeTab === 'members' && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                        {member.user?.nickname?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.user?.nickname || 'Unknown User'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant={
                              member.role === 'owner'
                                ? 'success'
                                : member.role === 'moderator'
                                  ? 'info'
                                  : 'default'
                            }
                          >
                            {member.role}
                          </Badge>
                          {member.isMuted && (
                            <Badge variant="warning">
                              <MicOff className="w-3 h-3 mr-1" />
                              Muted
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {member.role !== 'owner' && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleModerationAction(member.isMuted ? 'unmute' : 'mute', member.userId)
                          }
                          disabled={
                            muteMutation.isPending || unmuteMutation.isPending
                          }
                        >
                          {member.isMuted ? 'Unmute' : 'Mute'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleModerationAction('kick', member.userId)}
                          disabled={kickMutation.isPending}
                        >
                          Kick
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleModerationAction('ban', member.userId)}
                          disabled={banMutation.isPending}
                        >
                          Ban
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No members found</p>
                )}
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-red-200 dark:border-red-900/50">
                    <CardContent className="text-center py-4">
                      <Shield className="w-6 h-6 mx-auto mb-2 text-red-500" />
                      <p className="text-2xl font-bold">{bans.length}</p>
                      <p className="text-xs text-gray-500">Bans</p>
                    </CardContent>
                  </Card>
                  <Card className="border-amber-200 dark:border-amber-900/50">
                    <CardContent className="text-center py-4">
                      <MicOff className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">{mutes.length}</p>
                      <p className="text-xs text-gray-500">Mutes</p>
                    </CardContent>
                  </Card>
                  <Card className="border-gray-200 dark:border-gray-700">
                    <CardContent className="text-center py-4">
                      <UserX className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                      <p className="text-2xl font-bold">{kicks.length}</p>
                      <p className="text-xs text-gray-500">Kicks</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  {bans.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Active Bans ({bans.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {bans.map((ban) => (
                          <div
                            key={ban.id}
                            className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                          >
                            <span className="font-mono text-gray-600 dark:text-gray-400">
                              {ban.userId.slice(0, 8)}...
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleModerationAction('unban', ban.userId)}
                              disabled={unbanMutation.isPending}
                            >
                              Unban
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mutes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Active Mutes ({mutes.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {mutes.map((mute) => (
                          <div
                            key={mute.id}
                            className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm"
                          >
                            <span className="font-mono text-gray-600 dark:text-gray-400">
                              {mute.userId.slice(0, 8)}...
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleModerationAction('unmute', mute.userId)}
                              disabled={unmuteMutation.isPending}
                            >
                              Unmute
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bans.length === 0 && mutes.length === 0 && kicks.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No moderation actions recorded
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}