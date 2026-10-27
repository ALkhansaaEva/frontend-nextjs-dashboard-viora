'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Crown, Inbox, Shield, Clock, Search, Trophy, Award } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { FileUpload } from '@/shared/components/upload/FileUpload';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ActionButtons } from '@/shared/components/ui/ActionButtons';
import { ranksService } from '@/services';
import { useLanguage } from '@/components/language-context';
import { useHasPermission } from '@/hooks';

interface SystemRank {
  id: string;
  code: string;
  titleI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  badgeItemId?: string;
  badgeIconUrl?: string;
  priority: number;
  createdAt?: string;
}

export default function RanksPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canManage =
    hasPermission('matches.write') || hasPermission('manage_games');

  const [showModal, setShowModal] = useState(false);
  const [editingRank, setEditingRank] = useState<SystemRank | null>(null);
  const [selectedRank, setSelectedRank] = useState<SystemRank | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', priority: 0, badgeIconUrl: '',
  });

  const { data: ranks = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['system-ranks'],
    queryFn: () => ranksService.getSystemRanks(),
  });

  const filteredRanks = useMemo(() => {
    if (!searchQuery) return ranks;
    const q = searchQuery.toLowerCase();
    return ranks.filter(r =>
      r.code.toLowerCase().includes(q) ||
      r.titleI18n?.en?.toLowerCase().includes(q) ||
      r.titleI18n?.ar?.includes(q)
    );
  }, [ranks, searchQuery]);

  const createMutation = useMutation({
    mutationFn: (data: { code: string; titleI18n: Record<string, string>; descriptionI18n: Record<string, string>; priority: number; badgeIconUrl?: string }) =>
      ranksService.createSystemRank(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-ranks'], refetchType: 'all' }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { titleI18n: Record<string, string>; descriptionI18n: Record<string, string>; badgeIconUrl?: string; priority: number } }) =>
      ranksService.updateSystemRank(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['system-ranks'], refetchType: 'all' }); closeModal(); },
  });

  const openCreate = () => {
    setEditingRank(null);
    setForm({ code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', priority: 0, badgeIconUrl: '' });
    setShowModal(true);
  };

  const openEdit = (rank: SystemRank) => {
    setEditingRank(rank);
    setForm({
      code: rank.code, titleEn: rank.titleI18n?.en || '', titleAr: rank.titleI18n?.ar || '',
      descriptionEn: rank.descriptionI18n?.en || '', descriptionAr: rank.descriptionI18n?.ar || '',
      priority: rank.priority, badgeIconUrl: rank.badgeIconUrl || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingRank(null); };

  const handleSubmit = () => {
    if (editingRank) {
      updateMutation.mutate({
        id: editingRank.id,
        data: {
          titleI18n: { en: form.titleEn, ar: form.titleAr },
          descriptionI18n: { en: form.descriptionEn, ar: form.descriptionAr },
          priority: form.priority,
          badgeIconUrl: form.badgeIconUrl || undefined,
        },
      });
    } else {
      createMutation.mutate({
        code: form.code,
        titleI18n: { en: form.titleEn, ar: form.titleAr },
        descriptionI18n: { en: form.descriptionEn, ar: form.descriptionAr },
        priority: form.priority,
        badgeIconUrl: form.badgeIconUrl || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Crown className="w-6 h-6 text-yellow-500" />}
        title="System Rank Definitions"
        action={canManage ? { label: t('create') || 'Create Rank', onClick: openCreate, icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-indigo-300 bg-indigo-50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Global system ranks — this page</p>
          <p className="mt-1 text-xs text-indigo-800/75 dark:text-indigo-200/75">
            Manually assigned platform-wide badges. The ranks API supports create, update, assign and revoke; it has no delete endpoint.
          </p>
        </div>
        <Link href="/dashboard/meta-game" className="rounded-xl border border-purple-300 bg-purple-50 p-4 transition-colors hover:border-purple-400 dark:border-purple-500/30 dark:bg-purple-500/10">
          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Competitive game ratings</p>
          <p className="mt-1 text-xs text-purple-800/75 dark:text-purple-200/75">Backend-calculated Ludo and Domino rating, tier, record, and leaderboard.</p>
        </Link>
        <Link href="/dashboard/progression" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 transition-colors hover:border-emerald-400 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Room progression levels</p>
          <p className="mt-1 text-xs text-emerald-800/75 dark:text-emerald-200/75">Formula/policy-driven room levels and XP caps live under Progression.</p>
        </Link>
        <Link href="/dashboard/rooms" className="rounded-xl border border-amber-300 bg-amber-50 p-4 transition-colors hover:border-amber-400 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Room roles & permissions</p>
          <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-200/75">Owner, moderator and membership authority belongs to Rooms—not progression or global ranks.</p>
        </Link>
      </div>

      {isError && <QueryErrorNotice error={error} onRetry={() => refetch()} />}

      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ranks..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>
        <p className="text-sm text-gray-500 shrink-0">
          {filteredRanks.length} / {ranks.length} ranks
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredRanks.map((rank) => {
          const tier = Math.min(rank.priority, 5);
          const TIERS = [
            { gradient: 'from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600', color: 'text-gray-400 dark:text-gray-500' },
            { gradient: 'from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30', color: 'text-amber-500' },
            { gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/30', color: 'text-indigo-500' },
            { gradient: 'from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30', color: 'text-rose-500' },
            { gradient: 'from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30', color: 'text-emerald-500' },
            { gradient: 'from-yellow-50 to-amber-100 dark:from-yellow-900/30 dark:to-amber-800/30', color: 'text-yellow-500' },
          ];
          const t = TIERS[tier] ?? TIERS[0]!;
          return (
            <div key={rank.id} className="cursor-pointer" onClick={() => setSelectedRank(rank)}>
              <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group h-full">
                <div className={`aspect-square bg-gradient-to-br ${t.gradient} flex items-center justify-center relative`}>
                  {rank.badgeIconUrl ? (
                    <img src={rank.badgeIconUrl} alt="" className="w-full h-full object-contain p-4 transition-transform duration-200 group-hover:scale-110"
                      onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                  ) : (
                    <Crown className={`w-16 h-16 ${t.color}`} />
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400">
                      #{rank.priority}
                    </span>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-semibold text-sm truncate text-gray-900 dark:text-white">{rank.titleI18n?.en || rank.code}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{rank.code}</p>
                  {rank.descriptionI18n?.en && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{rank.descriptionI18n.en}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      {tier >= 3 ? <Trophy className={`w-3 h-3 ${t.color}`} /> : tier >= 1 ? <Award className="w-3 h-3 text-gray-400" /> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {rank.titleI18n?.ar && (
                        <span className="text-[11px] text-gray-400" dir="rtl">{rank.titleI18n.ar}</span>
                      )}
                      {canManage && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ActionButtons
                            onEdit={() => openEdit(rank)}
                            canManage={canManage}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
        {filteredRanks.length === 0 && !error && (
          <EmptyState message={searchQuery ? 'No ranks match your search' : 'No ranks found'} icon={<Inbox className="w-10 h-10" />} />
        )}
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedRank} onClose={() => setSelectedRank(null)} title={selectedRank?.titleI18n?.en || selectedRank?.code || 'Rank Details'} size="lg">
        {selectedRank && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                {selectedRank.badgeIconUrl ? (
                  <img src={selectedRank.badgeIconUrl} alt="" className="w-12 h-12 object-contain" />
                ) : (
                  <Crown className="w-8 h-8 text-yellow-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">Priority: {selectedRank.priority}</Badge>
                  {selectedRank.createdAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(selectedRank.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold">{selectedRank.titleI18n?.en || selectedRank.code}</h3>
                <p className="text-sm text-gray-500 font-mono">{selectedRank.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-500">Title (EN)</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium">{selectedRank.titleI18n?.en || '—'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-500">Title (AR)</span>
                </div>
                <p className="text-gray-900 dark:text-white font-medium" dir="rtl">{selectedRank.titleI18n?.ar || '—'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">Description (EN)</label>
              <p className="text-gray-900 dark:text-white">{selectedRank.descriptionI18n?.en || 'No description'}</p>
            </div>

            {selectedRank.descriptionI18n?.ar && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Description (AR)</label>
                <p className="text-gray-900 dark:text-white" dir="rtl">{selectedRank.descriptionI18n.ar}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Priority</p>
                <p className="font-medium text-lg">{selectedRank.priority}</p>
              </div>
              {selectedRank.badgeItemId && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Badge Item ID</p>
                  <p className="font-medium text-sm font-mono">{selectedRank.badgeItemId}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canManage && (
                <Button variant="outline" onClick={() => { setSelectedRank(null); openEdit(selectedRank); }}>Edit</Button>
              )}
              <Button variant="ghost" onClick={() => setSelectedRank(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingRank ? (t('edit') || 'Edit Rank') : (t('create') || 'Create Rank')}>
        <div className="space-y-4">
          <Input label="Code" placeholder="e.g., SUPPORTER" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editingRank} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Title (English)" placeholder="VIP" value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            <Input label="Title (Arabic)" placeholder="مستخدم VIP" value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Description (English)" placeholder="VIP description" value={form.descriptionEn}
              onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
            <Input label="Description (Arabic)" placeholder="وصف VIP" value={form.descriptionAr}
              onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
          </div>
          <FileUpload profile="store" label="Badge Icon" placeholder="icon URL or upload" value={form.badgeIconUrl}
            onChange={(v) => setForm({ ...form, badgeIconUrl: v })} />
          <Input label="Priority" type="number" placeholder="0" value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} />
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={!form.code || createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingRank ? (t('save') || 'Save Changes') : (t('create') || 'Create Rank'))}</Button>
            <Button variant="outline" onClick={closeModal}>{t('cancel') || 'Cancel'}</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
