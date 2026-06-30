/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, Pencil, Trash2, EyeOff, Coins, Gem, Zap, Sparkles, Swords } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { achievementsService, type Achievement, type CreateAchievementRequest, type UpdateAchievementRequest } from '@/services/achievements.service';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks';

const RARITY_STYLES: { [key: string]: { variant: string; icon: string } } = {
  common: { variant: 'default', icon: '⚪' },
  rare: { variant: 'info', icon: '🔵' },
  epic: { variant: 'warning', icon: '🟣' },
  legendary: { variant: 'success', icon: '🟠' },
};

function rarityBadge(rarity: string) {
  const style = RARITY_STYLES[rarity] || { variant: 'default', icon: '⚪' };
  return <Badge variant={style.variant as any}>{style.icon} {rarity}</Badge>;
}

export default function AchievementsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canManage = hasPermission('manage_games');

  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: '',
    titleI18n: '{}',
    descriptionI18n: '{}',
    maxProgress: 1,
    isHidden: false,
    isActive: true,
  });

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsService.getAchievements(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAchievementRequest) => achievementsService.createAchievement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAchievementRequest }) => achievementsService.updateAchievement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => achievementsService.deleteAchievement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setEditingAchievement(null);
    setForm({ code: '', titleI18n: '{}', descriptionI18n: '{}', maxProgress: 1, isHidden: false, isActive: true });
    setShowModal(true);
  };

  const openEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setForm({
      code: achievement.code,
      titleI18n: JSON.stringify(achievement.title),
      descriptionI18n: JSON.stringify(achievement.description),
      maxProgress: achievement.criteria.target,
      isHidden: achievement.isHidden,
      isActive: achievement.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAchievement(null);
  };

  const handleSubmit = () => {
    let titleI18n: Record<string, string> = {};
    let descriptionI18n: Record<string, string> = {};
    try { titleI18n = JSON.parse(form.titleI18n); } catch { titleI18n = { en: form.titleI18n }; }
    try { descriptionI18n = JSON.parse(form.descriptionI18n); } catch { descriptionI18n = { en: form.descriptionI18n }; }

    const payload: CreateAchievementRequest = {
      code: form.code,
      titleI18n,
      descriptionI18n: Object.keys(descriptionI18n).length > 0 ? descriptionI18n : undefined,
      maxProgress: form.maxProgress,
      isHidden: form.isHidden,
      isActive: form.isActive,
    };

    if (editingAchievement) {
      updateMutation.mutate({ id: editingAchievement.id, data: payload as UpdateAchievementRequest });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          {t('achievements') || 'Achievements'}
        </h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> {t('create') || 'Create'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a) => (
          <Card key={a.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold truncate">
                    {a.title?.en || a.title?.ar || a.code}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{a.code}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {a.isActive ? (
                    <Badge variant="success">{t('active')}</Badge>
                  ) : (
                    <Badge variant="danger">{t('inactive')}</Badge>
                  )}
                  {a.isHidden && <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {a.description?.en && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{a.description.en}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {rarityBadge(a.rarity)}
                <Badge variant="outline">{a.criteria.type.replace(/_/g, ' ')}</Badge>
                {a.criteria.gameType && <Badge variant="default">{a.criteria.gameType}</Badge>}
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" />
                  {a.criteria.target}
                </span>
              </div>

              {(a.rewards.gold || a.rewards.gems || a.rewards.xp || a.rewards.itemCode) && (
                <div className="flex flex-wrap items-center gap-3 text-sm pt-1 border-t border-gray-100 dark:border-gray-700">
                  {a.rewards.gold ? (
                    <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                      <Coins className="w-3.5 h-3.5" /> {a.rewards.gold}
                    </span>
                  ) : null}
                  {a.rewards.gems ? (
                    <span className="flex items-center gap-1 text-blue-500">
                      <Gem className="w-3.5 h-3.5" /> {a.rewards.gems}
                    </span>
                  ) : null}
                  {a.rewards.xp ? (
                    <span className="flex items-center gap-1 text-purple-500">
                      <Zap className="w-3.5 h-3.5" /> {a.rewards.xp} XP
                    </span>
                  ) : null}
                  {a.rewards.itemCode ? (
                    <span className="flex items-center gap-1 text-orange-500">
                      <Sparkles className="w-3.5 h-3.5" /> {a.rewards.itemCode}
                    </span>
                  ) : null}
                </div>
              )}

              {canManage && (
                <div className="flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(a.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {achievements.length === 0 && (
          <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400">{t('noData')}</div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title={editingAchievement ? (t('edit') || 'Edit Achievement') : (t('create') || 'Create Achievement')}>
        <div className="space-y-4">
          <Input
            label={t('code')}
            placeholder="achievement_code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            disabled={!!editingAchievement}
          />
          <Input
            label={t('titleI18n') || 'Title (JSON)'}
            placeholder='{"en":"Title","ar":"عنوان"}'
            value={form.titleI18n}
            onChange={(e) => setForm({ ...form, titleI18n: e.target.value })}
          />
          <Input
            label={t('descriptionI18n') || 'Description (JSON)'}
            placeholder='{"en":"Description","ar":"وصف"}'
            value={form.descriptionI18n}
            onChange={(e) => setForm({ ...form, descriptionI18n: e.target.value })}
          />
          <Input
            label={t('maxProgress') || 'Max Progress'}
            type="number"
            value={form.maxProgress}
            onChange={(e) => setForm({ ...form, maxProgress: parseInt(e.target.value) || 1 })}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isHidden} onChange={(e) => setForm({ ...form, isHidden: e.target.checked })} />
              {t('hidden') || 'Hidden'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              {t('active')}
            </label>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={closeModal}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.code}>{t('save') || 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Achievement'}
        message={t('deleteConfirm') || 'Are you sure you want to delete this achievement?'}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }}
      />
    </div>
  );
}
