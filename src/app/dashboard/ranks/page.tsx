'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Crown, Inbox, Shield, Clock, Search, Trophy, Award } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { FileUpload } from '@/shared/components/upload/FileUpload';
import { PageHeader } from '@/shared/components/ui/PageHeader';
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
  const canManage = hasPermission('manage_roles');

  const [showModal, setShowModal] = useState(false);
  const [editingRank, setEditingRank] = useState<SystemRank | null>(null);
  const [selectedRank, setSelectedRank] = useState<SystemRank | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', priority: 0, badgeIconUrl: '',
  });

  const { data: ranks = [], isLoading, error } = useQuery({
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
        title={t('ranks') || 'System Ranks'}
        action={canManage ? { label: t('create') || 'Create Rank', onClick: openCreate, icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
        </div>
      )}

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
            { gradient: 'from-gray-300/40 to-gray-200/20 dark:from-gray-700/40 dark:to-gray-600/20', color: 'text-gray-400' },
            { gradient: 'from-amber-400/30 via-amber-300/20 to-yellow-200/20 dark:from-amber-800/40 dark:via-amber-700/20 dark:to-yellow-800/30', color: 'text-amber-500' },
            { gradient: 'from-indigo-400/30 via-purple-300/20 to-blue-200/20 dark:from-indigo-800/40 dark:via-purple-700/20 dark:to-blue-800/30', color: 'text-indigo-500' },
            { gradient: 'from-rose-400/30 via-pink-300/20 to-red-200/20 dark:from-rose-800/40 dark:via-pink-700/20 dark:to-red-800/30', color: 'text-rose-500' },
            { gradient: 'from-emerald-400/30 via-teal-300/20 to-green-200/20 dark:from-emerald-800/40 dark:via-teal-700/20 dark:to-green-800/30', color: 'text-emerald-500' },
            { gradient: 'from-yellow-400/30 via-amber-300/20 to-orange-200/20 dark:from-yellow-800/40 dark:via-amber-700/20 dark:to-orange-800/30', color: 'text-yellow-500' },
          ];
          const t = TIERS[tier] ?? TIERS[0]!;
          return (
            <div key={rank.id} className="cursor-pointer group" onClick={() => setSelectedRank(rank)}>
              <Card hover className="overflow-hidden h-full">
                <div className={`aspect-square bg-gradient-to-br ${t.gradient} flex items-center justify-center relative`}>
                  {/* Badge icon */}
                  {rank.badgeIconUrl ? (
                    <div className="relative">
                      <img src={rank.badgeIconUrl} alt="" className="w-14 h-14 object-contain drop-shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-6"
                        onError={(e) => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.querySelector('.rank-fallback')?.classList.remove('hidden'); }} />
                      <Crown className={`w-12 h-12 hidden rank-fallback ${t.color} transition-all duration-300 group-hover:scale-110`} />
                    </div>
                  ) : (
                    <Crown className={`w-12 h-12 ${t.color} transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 drop-shadow`} />
                  )}
                  {/* Glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                  {/* Priority badge top-right */}
                  <div className="absolute top-2 right-2">
                    <div className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-600 dark:text-gray-300 shadow-sm border">
                      #{rank.priority}
                    </div>
                  </div>
                  {/* Trophy indicator bottom-right */}
                  <div className="absolute bottom-2 right-2">
                    {tier >= 3 ? (
                      <Trophy className={`w-4 h-4 ${t.color}`} />
                    ) : tier >= 1 ? (
                      <Award className="w-4 h-4 text-gray-400" />
                    ) : null}
                  </div>
                  {/* Arabic title bottom-left */}
                  {rank.titleI18n?.ar && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-[10px] text-gray-500/70 dark:text-gray-400/70 font-medium" dir="rtl">{rank.titleI18n.ar}</span>
                    </div>
                  )}
                </div>
                <CardContent className="p-2.5">
                  <h3 className="font-bold text-xs truncate text-gray-900 dark:text-white">{rank.titleI18n?.en || rank.code}</h3>
                  {rank.descriptionI18n?.en ? (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{rank.descriptionI18n.en}</p>
                  ) : (
                    <p className="text-[11px] text-gray-300 dark:text-gray-600 italic mt-0.5">No description</p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-400 font-mono">{rank.code}</span>
                    </div>
                    {canManage && (
                      <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionButtons
                          onEdit={() => openEdit(rank)}
                          onDelete={() => setDeleteTarget(rank.id)}
                          canManage={canManage}
                        />
                      </div>
                    )}
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
                <>
                  <Button variant="outline" onClick={() => { setSelectedRank(null); openEdit(selectedRank); }}>Edit</Button>
                  <Button variant="danger" onClick={() => { setSelectedRank(null); setDeleteTarget(selectedRank.id); }}>Delete</Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setSelectedRank(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={closeModal} title={editingRank ? (t('edit') || 'Edit Rank') : (t('create') || 'Create Rank')}>
        <div className="space-y-4">
          <Input label="Code" placeholder="e.g., vip, moderator" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editingRank} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Title (English)" placeholder="VIP" value={form.titleEn}
              onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
            <Input label="Title (Arabic)" placeholder="مستخدم VIP" value={form.titleAr}
              onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Rank'}
        message={t('deleteConfirm') || 'Are you sure you want to delete this rank?'}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            queryClient.invalidateQueries({ queryKey: ['system-ranks'] });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
