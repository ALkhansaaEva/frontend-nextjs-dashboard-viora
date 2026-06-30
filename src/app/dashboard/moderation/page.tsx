'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, Ban, MessageSquare, AlertTriangle, User, Search, Plus,
  DoorOpen, XCircle, CheckCircle, Users, Copy,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { healthService, moderationService, adminService, roomsService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { useAuthStore } from '@/store';
import { PageSkeleton } from '@/components/skeletons';
import type { Sanction, User as UserType } from '@/types';

const SANCTION_TYPES = [
  { value: 'ban', label: 'Ban', labelAr: 'حظر', icon: Ban, color: 'text-red-600' },
  { value: 'mute', label: 'Mute', labelAr: 'كتم', icon: MessageSquare, color: 'text-amber-600' },
  { value: 'warning', label: 'Warning', labelAr: 'تحذير', icon: AlertTriangle, color: 'text-yellow-600' },
] as const;

const ROOM_ACTION_TYPES = [
  { value: 'ban', label: 'Ban', labelAr: 'حظر', icon: Ban, color: 'text-red-600' },
  { value: 'mute', label: 'Mute', labelAr: 'كتم', icon: MessageSquare, color: 'text-amber-600' },
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function UserSearchItem({ user, onSelect }: { user: UserType; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(user.id)}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
    >
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {(user.email?.[0] || '?').toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.email || 'Unknown'}</p>
        <p className="text-xs text-gray-400 font-mono truncate">{user.id} — <Copy className="w-3 h-3 inline" /></p>
      </div>
    </button>
  );
}

export default function ModerationPage() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'sanctions' | 'rooms'>('sanctions');

  // Sanction form
  const [userId, setUserId] = useState('');
  const [sanctionType, setSanctionType] = useState<string>('ban');
  const [reason, setReason] = useState('');
  const [durationHours, setDurationHours] = useState<number>(24);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User search (in Apply Sanction card)
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Room moderation
  const [roomId, setRoomId] = useState('');
  const [roomActionUserId, setRoomActionUserId] = useState('');
  const [roomActionType, setRoomActionType] = useState<string>('ban');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => healthService.getDashboardStats(),
    staleTime: 30000,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['user-search2', userSearch],
    queryFn: () => adminService.searchUsers({ search: userSearch, email: userSearch, limit: 8 }),
    enabled: userSearch.length >= 3,
  });

  const { data: userSanctions, isLoading: sanctionsLoading } = useQuery({
    queryKey: ['user-sanctions', selectedUserId],
    queryFn: () => moderationService.getActiveSanctions(selectedUserId),
    enabled: selectedUserId.length > 0,
  });

  const { data: roomBans } = useQuery({
    queryKey: ['room-bans', roomId],
    queryFn: () => roomsService.getBans(roomId),
    enabled: roomId.length > 0,
  });

  const { data: roomMutes } = useQuery({
    queryKey: ['room-mutes', roomId],
    queryFn: () => roomsService.getMutes(roomId),
    enabled: roomId.length > 0,
  });

  const applySanction = useMutation({
    mutationFn: () => moderationService.sanctionUser(userId, {
      sanctionType: sanctionType as 'ban' | 'mute' | 'warning',
      reason,
      durationHours: sanctionType !== 'warning' ? durationHours : undefined,
    }),
    onSuccess: () => {
      setStatusMsg({ type: 'success', text: isRTL ? 'تم تطبيق العقوبة بنجاح' : 'Sanction applied' });
      setUserId('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-sanctions'] });
    },
    onError: (err: any) => {
      const msg = err?.message || err?.error?.message || '';
      setStatusMsg({
        type: 'error',
        text: isRTL
          ? `فشل: ${msg.includes('uuid') ? 'يجب استخدام UUID صحيح (ابحث عن المستخدم أولاً)' : msg || 'خطأ غير معروف'}`
          : `Failed: ${msg.includes('uuid') ? 'use a valid UUID (search for the user first)' : msg || 'Unknown error'}`,
      });
    },
  });

  const handleUserSelect = useCallback((id: string) => {
    setSelectedUserId(id);
    setUserId(id);
    setUserSearch('');
  }, []);

  const handleRoomAction = useMutation({
    mutationFn: async () => {
      if (roomActionType === 'ban') return roomsService.banUser(roomId, roomActionUserId);
      return roomsService.muteUser(roomId, roomActionUserId);
    },
    onSuccess: () => {
      setRoomActionUserId('');
      queryClient.invalidateQueries({ queryKey: ['room-bans', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room-mutes', roomId] });
    },
  });

  const isValidUuid = UUID_REGEX.test(userId);

  if (statsLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg shadow-red-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('moderation')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {isRTL ? 'إدارة العقوبات على مستوى النظام والغرف' : 'System & room moderation'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30"><Shield className="w-6 h-6 text-red-600 dark:text-red-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'العقوبات النشطة' : 'Active Sanctions'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeSanctions ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30"><AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'التقارير النشطة' : 'Active Reports'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeReports ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30"><Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'إجمالي المستخدمين' : 'Total Users'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalUsers ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30"><DoorOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isRTL ? 'الغرف النشطة' : 'Active Rooms'}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeRooms ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button onClick={() => setActiveTab('sanctions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'sanctions'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          {isRTL ? 'عقوبات النظام' : 'System Sanctions'}
        </button>
        <button onClick={() => setActiveTab('rooms')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'rooms'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}>
          {isRTL ? 'إدارة الغرف' : 'Room Moderation'}
        </button>
      </div>

      {/* ── SYSTEM SANCTIONS ── */}
      {activeTab === 'sanctions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Apply Sanction + User Search */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                <CardTitle className="text-base font-bold">
                  {isRTL ? 'تطبيق عقوبة جديدة' : 'Apply New Sanction'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search user by email/name */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'ابحث عن المستخدم' : 'Search user'}
                </label>
                <input type="text" value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserId(''); }}
                  placeholder={isRTL ? 'البريد الإلكتروني أو الاسم...' : 'Email or name...'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                {userSearch.length >= 3 && searchResults && searchResults.data.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {searchResults.data.slice(0, 5).map(u => (
                      <UserSearchItem key={u.id} user={u} onSelect={handleUserSelect} />
                    ))}
                  </div>
                )}
                {userSearch.length >= 3 && searchResults && searchResults.data.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
                )}
              </div>

              {/* Selected user */}
              {selectedUserId && (
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                    {isRTL ? 'المستخدم المحدد' : 'Selected user'}
                  </p>
                  <p className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{selectedUserId}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'نوع العقوبة' : 'Sanction Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SANCTION_TYPES.map(st => {
                    const Icon = st.icon;
                    return (
                      <button key={st.value} onClick={() => setSanctionType(st.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm ${
                          sanctionType === st.value
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}>
                        <Icon className={`w-5 h-5 ${sanctionType === st.value ? st.color : 'text-gray-400'}`} />
                        <span className="font-medium text-gray-700 dark:text-gray-300">{isRTL ? st.labelAr : st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'السبب' : 'Reason'}
                </label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                  placeholder={isRTL ? 'اذكر سبب العقوبة' : 'Describe the reason'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none" />
              </div>
              {sanctionType !== 'warning' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    {isRTL ? 'المدة (ساعات)' : 'Duration (hours)'}
                  </label>
                  <input type="number" min={1} max={8760} value={durationHours} onChange={e => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
              )}
              {statusMsg && (
                <div className={`p-3 rounded-lg text-sm ${
                  statusMsg.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>{statusMsg.text}</div>
              )}
              <button onClick={() => applySanction.mutate()}
                disabled={!isValidUuid || !reason || applySanction.isPending}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold rounded-xl hover:from-red-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                {applySanction.isPending ? (isRTL ? 'جارٍ التطبيق...' : 'Applying...') : (isRTL ? 'تطبيق العقوبة' : 'Apply')}
              </button>
              <p className="text-xs text-gray-400">{isRTL ? `بواسطة: ${user?.email || '-'}` : `By: ${user?.email || '-'}`}</p>
            </CardContent>
          </Card>

          {/* User Sanctions Viewer */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-base font-bold">
                  {isRTL ? 'عقوبات المستخدم' : 'User Sanctions'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {selectedUserId ? (
                <>
                  <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <p className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate">{selectedUserId}</p>
                  </div>
                  {sanctionsLoading && <p className="text-sm text-gray-400 text-center py-4">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>}
                  {!sanctionsLoading && userSanctions && userSanctions.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">{isRTL ? 'لا توجد عقوبات نشطة' : 'No active sanctions'}</p>
                    </div>
                  )}
                  {!sanctionsLoading && userSanctions && userSanctions.length > 0 && (
                    <div className="space-y-3">
                      {userSanctions.map((s: Sanction) => (
                        <div key={s.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant={s.sanctionType === 'ban' ? 'danger' : s.sanctionType === 'mute' ? 'warning' : 'default'}>
                              {isRTL ? (s.sanctionType === 'ban' ? 'حظر' : s.sanctionType === 'mute' ? 'كتم' : 'تحذير') : s.sanctionType}
                            </Badge>
                            {s.expiresAt && <span className="text-xs text-gray-400">{isRTL ? 'ينتهي' : 'Expires'}: {formatDate(s.expiresAt)}</span>}
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{s.reason}</p>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{isRTL ? 'بواسطة' : 'By'}: {s.createdBy}</span>
                            <span>{formatDate(s.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">{isRTL ? 'ابحث عن مستخدم في النموذج المجاور لعرض عقوباته' : 'Search for a user in the form to view their sanctions'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ROOM MODERATION ── */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-emerald-500" />
                <CardTitle className="text-base font-bold">
                  {isRTL ? 'إجراءات الغرفة' : 'Room Actions'}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  {isRTL ? 'معرف الغرفة' : 'Room ID'}
                </label>
                <input type="text" value={roomId} onChange={e => setRoomId(e.target.value)}
                  placeholder={isRTL ? 'أدخل معرف الغرفة' : 'Enter room ID'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              {roomId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      {isRTL ? 'معرف المستخدم' : 'User ID'}
                    </label>
                    <input type="text" value={roomActionUserId} onChange={e => setRoomActionUserId(e.target.value)}
                      placeholder={isRTL ? 'أدخل معرف المستخدم' : 'Enter user ID'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {isRTL ? 'نوع الإجراء' : 'Action Type'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROOM_ACTION_TYPES.map(at => {
                        const Icon = at.icon;
                        return (
                          <button key={at.value} onClick={() => setRoomActionType(at.value)}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all text-sm ${
                              roomActionType === at.value
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}>
                            <Icon className={`w-4 h-4 ${roomActionType === at.value ? at.color : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-700 dark:text-gray-300">{isRTL ? at.labelAr : at.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => handleRoomAction.mutate()}
                    disabled={!roomActionUserId || handleRoomAction.isPending}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                    {handleRoomAction.isPending ? (isRTL ? 'جارٍ...' : 'Executing...') : (isRTL ? 'تطبيق' : 'Execute')}
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {roomId && (
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <CardTitle className="text-base font-bold">
                    {isRTL ? 'محظورو ومكتومو الغرفة' : 'Room Bans & Mutes'}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                    {isRTL ? 'المحظورون' : 'Bans'} ({roomBans?.length ?? 0})
                  </p>
                  {roomBans && roomBans.length > 0 ? (
                    <div className="space-y-2">
                      {roomBans.map((b: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{b.targetUserId || b.userId || b.id}</span>
                          <span className="text-xs text-gray-400">{b.reason || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">{isRTL ? 'لا يوجد محظورون' : 'No bans'}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                    {isRTL ? 'المكتومون' : 'Mutes'} ({roomMutes?.length ?? 0})
                  </p>
                  {roomMutes && roomMutes.length > 0 ? (
                    <div className="space-y-2">
                      {roomMutes.map((m: any, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">{m.targetUserId || m.userId || m.id}</span>
                          <span className="text-xs text-gray-400">{m.reason || '-'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">{isRTL ? 'لا يوجد مكتومون' : 'No mutes'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
