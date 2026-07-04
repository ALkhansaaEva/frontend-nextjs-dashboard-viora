/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, Coins, Gem, Zap, Inbox, Filter, X, Tag, Award, Eye, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { FileUpload } from '@/shared/components/upload/FileUpload';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ViewToggle } from '@/shared/components/ui/ViewToggle';
import { AchievementCard } from '@/shared/components/achievements/AchievementCard';
import { AchievementTable } from '@/shared/components/achievements/AchievementTable';
import { achievementsService, type Achievement, type CreateAchievementRequest, type UpdateAchievementRequest } from '@/services/achievements.service';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';

const RARITIES = [
  { value: 'common', label: 'Common' }, { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' }, { value: 'legendary', label: 'Legendary' },
];

const CRITERIA_TYPES = [
  { value: 'total_games', label: 'Total Games' },
  { value: 'total_wins', label: 'Total Wins' },
  { value: 'win_streak', label: 'Win Streak' },
  { value: 'total_coins', label: 'Total Coins Earned' },
  { value: 'total_gems', label: 'Total Gems Earned' },
  { value: 'rank_reached', label: 'Rank Reached' },
  { value: 'friends_count', label: 'Friends Count' },
  { value: 'gifts_sent', label: 'Gifts Sent' },
  { value: 'gifts_received', label: 'Gifts Received' },
  { value: 'rooms_joined', label: 'Rooms Joined' },
  { value: 'games_won', label: 'Games Won (specific)' },
  { value: 'consecutive_wins', label: 'Consecutive Wins' },
  { value: 'items_collected', label: 'Items Collected' },
  { value: 'login_streak', label: 'Login Streak' },
  { value: 'custom', label: 'Custom' },
];

const GAME_TYPES = [
  { value: '', label: 'Any' },
  { value: 'ludo', label: 'Ludo' },
  { value: 'domino', label: 'Domino' },
];

const rarityFilterOptions = [
  { value: '', label: 'All Rarities' },
  ...RARITIES,
];

function SectionCard({ icon: Icon, title, children, defaultOpen = true }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function DetailImg({ iconUrl }: { iconUrl?: string | null }) {
  const [err, setErr] = useState(false);
  if (!iconUrl || err) return <Trophy className="w-10 h-10 text-amber-500" />;
  return <img src={iconUrl} alt="" className="w-16 h-16 object-contain" onError={() => setErr(true)} />;
}

export default function AchievementsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const canManage = true;
  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [viewingAchievement, setViewingAchievement] = useState<Achievement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState({ rarity: '', status: '', hasReward: '' });
  const [form, setForm] = useState({
    code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
    rarity: 'common', criteriaType: 'total_games', criteriaTarget: 1, criteriaGameType: '',
    rewardGold: 0, rewardGems: 0, rewardXp: 0, rewardItemCode: '',
    iconUrl: '', isHidden: false, isActive: true,
  });

  const { data: achievements = [], isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsService.getAchievements(),
  });

  const filtered = useMemo(() => {
    let result = achievements;
    if (filter.rarity) result = result.filter((a) => a.rarity === filter.rarity);
    if (filter.status === 'active') result = result.filter((a) => a.isActive);
    if (filter.status === 'inactive') result = result.filter((a) => !a.isActive);
    if (filter.hasReward === 'yes') result = result.filter((a) => a.rewards.gold || a.rewards.gems || a.rewards.xp || a.rewards.itemCode);
    if (filter.hasReward === 'no') result = result.filter((a) => !a.rewards.gold && !a.rewards.gems && !a.rewards.xp && !a.rewards.itemCode);
    return result;
  }, [achievements, filter]);

  const activeFilters = Object.values(filter).filter((v) => v !== '').length;

  const createMutation = useMutation({
    mutationFn: (data: CreateAchievementRequest) => achievementsService.createAchievement(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['achievements'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAchievementRequest }) => achievementsService.updateAchievement(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['achievements'], refetchType: 'all' }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => achievementsService.deleteAchievement(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['achievements'] }); setDeleteTarget(null); },
  });

  const openCreate = () => {
    setEditingAchievement(null);
    setForm({ code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', rarity: 'common', criteriaType: 'total_games', criteriaTarget: 1, criteriaGameType: '', rewardGold: 0, rewardGems: 0, rewardXp: 0, rewardItemCode: '', iconUrl: '', isHidden: false, isActive: true });
    setShowModal(true);
  };

  const openEdit = (achievement: Achievement) => {
    setEditingAchievement(achievement);
    setForm({
      code: achievement.code,
      titleEn: achievement.title?.en || '',
      titleAr: achievement.title?.ar || '',
      descriptionEn: achievement.description?.en || '',
      descriptionAr: achievement.description?.ar || '',
      rarity: achievement.rarity,
      criteriaType: achievement.criteria?.type || 'total_games',
      criteriaTarget: achievement.criteria?.target || 1,
      criteriaGameType: achievement.criteria?.gameType || '',
      rewardGold: achievement.rewards?.gold || 0,
      rewardGems: achievement.rewards?.gems || 0,
      rewardXp: achievement.rewards?.xp || 0,
      rewardItemCode: achievement.rewards?.itemCode || '',
      iconUrl: achievement.iconUrl || '',
      isHidden: achievement.isHidden,
      isActive: achievement.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingAchievement(null); };

  const handleSubmit = () => {
    const titleI18n: Record<string, string> = { en: form.titleEn };
    if (form.titleAr) titleI18n.ar = form.titleAr;
    const descriptionI18n: Record<string, string> = {};
    if (form.descriptionEn) descriptionI18n.en = form.descriptionEn;
    if (form.descriptionAr) descriptionI18n.ar = form.descriptionAr;

    const payload: CreateAchievementRequest = {
      code: form.code,
      titleI18n,
      descriptionI18n: Object.keys(descriptionI18n).length > 0 ? descriptionI18n : undefined,
      rarity: form.rarity as CreateAchievementRequest['rarity'],
      criteria: {
        type: form.criteriaType,
        target: form.criteriaTarget,
        gameType: form.criteriaGameType || undefined,
      },
      iconUrl: form.iconUrl || undefined,
      isHidden: form.isHidden,
      isActive: form.isActive,
    };

    const hasRewards = form.rewardGold || form.rewardGems || form.rewardXp || form.rewardItemCode;
    if (hasRewards) {
      payload.rewards = {};
      if (form.rewardGold) payload.rewards.gold = form.rewardGold;
      if (form.rewardGems) payload.rewards.gems = form.rewardGems;
      if (form.rewardXp) payload.rewards.xp = form.rewardXp;
      if (form.rewardItemCode) payload.rewards.itemCode = form.rewardItemCode;
    }

    if (editingAchievement) {
      const { code, ...updateData } = payload;
      updateMutation.mutate({ id: editingAchievement.id, data: updateData as UpdateAchievementRequest });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Trophy className="w-6 h-6 text-yellow-500" />}
        title={t('achievements') || 'Achievements'}
        action={{ label: t('create') || 'Create', onClick: openCreate, icon: <Plus className="w-4 h-4" /> }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
              showFilters || activeFilters > 0
                ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Filter className="w-4 h-4" />
            {t('filter') || 'Filter'}
            {activeFilters > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-600 text-white rounded-full">{activeFilters}</span>}
          </button>
        </div>
        <p className="text-sm text-gray-500">{filtered.length} / {achievements.length} {t('items') || 'items'}</p>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <Select value={filter.rarity} onChange={(e) => setFilter({ ...filter, rarity: e.target.value })} options={rarityFilterOptions} className="w-36" />
          <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} options={[
            { value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
          ]} className="w-36" />
          <Select value={filter.hasReward} onChange={(e) => setFilter({ ...filter, hasReward: e.target.value })} options={[
            { value: '', label: 'All Rewards' }, { value: 'yes', label: 'Has Rewards' }, { value: 'no', label: 'No Rewards' },
          ]} className="w-36" />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilter({ rarity: '', status: '', hasReward: '' })} className="text-gray-500 hover:text-red-500">
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} canManage={canManage}
              onEdit={() => openEdit(a)} onDelete={() => setDeleteTarget(a.id)} />
          ))}
        </div>
      ) : (
        <AchievementTable achievements={filtered} canManage={canManage}
          onEdit={openEdit} onDelete={setDeleteTarget} onView={setViewingAchievement} />
      )}

      {(viewMode === 'grid' ? filtered.length === 0 : filtered.length === 0) && (
        <EmptyState message={t('noData') || 'No achievements'} icon={<Inbox className="w-10 h-10" />} />
      )}

      <Modal isOpen={!!viewingAchievement} onClose={() => setViewingAchievement(null)}
        title={viewingAchievement?.title?.en || viewingAchievement?.title?.ar || 'Achievement'} size="lg">
        {viewingAchievement && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                <DetailImg iconUrl={viewingAchievement.iconUrl} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline">{viewingAchievement.rarity}</Badge>
                  <Badge variant={viewingAchievement.isActive ? 'success' : 'danger'}>{viewingAchievement.isActive ? 'Active' : 'Inactive'}</Badge>
                  {viewingAchievement.isHidden && <Badge variant="warning">Hidden</Badge>}
                </div>
                <h3 className="text-xl font-bold">{viewingAchievement.title?.en || viewingAchievement.code}</h3>
                <p className="text-sm text-gray-500 font-mono">{viewingAchievement.code}</p>
              </div>
            </div>

            {viewingAchievement.description?.en && (
              <div><label className="text-sm font-medium text-gray-500">Description</label><p className="text-gray-900 dark:text-white mt-1">{viewingAchievement.description.en}</p></div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Criteria Type</p>
                <p className="font-medium capitalize">{viewingAchievement.criteria.type.replace(/_/g, ' ')}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Target</p>
                <p className="font-medium">{viewingAchievement.criteria.target}</p>
              </div>
              {viewingAchievement.criteria.gameType && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Game Type</p>
                  <p className="font-medium capitalize">{viewingAchievement.criteria.gameType}</p>
                </div>
              )}
            </div>

            {(viewingAchievement.rewards.gold || viewingAchievement.rewards.gems || viewingAchievement.rewards.xp || viewingAchievement.rewards.itemCode) && (
              <div>
                <label className="text-sm font-medium text-gray-500 mb-2 block">Rewards</label>
                <div className="flex flex-wrap gap-3">
                  {viewingAchievement.rewards.gold ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <Coins className="w-5 h-5 text-yellow-500" />
                      <span className="font-bold text-amber-700 dark:text-amber-300">{viewingAchievement.rewards.gold}</span>
                      <span className="text-sm text-amber-600 dark:text-amber-400">Gold</span>
                    </div>
                  ) : null}
                  {viewingAchievement.rewards.gems ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Gem className="w-5 h-5 text-blue-500" />
                      <span className="font-bold text-blue-700 dark:text-blue-300">{viewingAchievement.rewards.gems}</span>
                      <span className="text-sm text-blue-600 dark:text-blue-400">Gems</span>
                    </div>
                  ) : null}
                  {viewingAchievement.rewards.xp ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Zap className="w-5 h-5 text-purple-500" />
                      <span className="font-bold text-purple-700 dark:text-purple-300">{viewingAchievement.rewards.xp}</span>
                      <span className="text-sm text-purple-600 dark:text-purple-400">XP</span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canManage && (
                <>
                  <Button variant="outline" onClick={() => { setViewingAchievement(null); openEdit(viewingAchievement); }}>Edit</Button>
                  <Button variant="danger" onClick={() => { setViewingAchievement(null); setDeleteTarget(viewingAchievement.id); }}>Delete</Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setViewingAchievement(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showModal} onClose={closeModal}
        title={editingAchievement ? (t('edit') || 'Edit Achievement') : (t('create') || 'Create Achievement')} size="lg">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <SectionCard icon={Tag} title="Basic Information">
            <Input label="Code *" placeholder="achievement_code" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editingAchievement} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title (EN) *" placeholder="Achievement Name" value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
              <Input label="Title (AR)" placeholder="اسم الإنجاز" value={form.titleAr}
                onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Description (EN)" placeholder="Description in English" value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
              <Input label="Description (AR)" placeholder="وصف الإنجاز" value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
            </div>
            <Select label="Rarity" value={form.rarity}
              onChange={(e) => setForm({ ...form, rarity: e.target.value })} options={RARITIES} />
            <FileUpload profile="achievement" label="Icon URL" placeholder="icon URL or upload" value={form.iconUrl}
              onChange={(v) => setForm({ ...form, iconUrl: v })} />
          </SectionCard>

          <SectionCard icon={Target} title="Criteria">
            <Select label="Criteria Type" value={form.criteriaType}
              onChange={(e) => setForm({ ...form, criteriaType: e.target.value })} options={CRITERIA_TYPES} />
            <Input label="Target Value *" type="number" value={form.criteriaTarget}
              onChange={(e) => setForm({ ...form, criteriaTarget: parseInt(e.target.value) || 1 })} />
            <Select label="Game Type" value={form.criteriaGameType}
              onChange={(e) => setForm({ ...form, criteriaGameType: e.target.value })} options={GAME_TYPES} />
          </SectionCard>

          <SectionCard icon={Award} title="Rewards">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Gold" type="number" value={form.rewardGold}
                onChange={(e) => setForm({ ...form, rewardGold: parseInt(e.target.value) || 0 })}
                icon={<Coins className="w-4 h-4 text-yellow-500" />} />
              <Input label="Gems" type="number" value={form.rewardGems}
                onChange={(e) => setForm({ ...form, rewardGems: parseInt(e.target.value) || 0 })}
                icon={<Gem className="w-4 h-4 text-purple-500" />} />
              <Input label="XP" type="number" value={form.rewardXp}
                onChange={(e) => setForm({ ...form, rewardXp: parseInt(e.target.value) || 0 })}
                icon={<Zap className="w-4 h-4 text-purple-500" />} />
              <Input label="Item Code" placeholder="item_code_to_grant" value={form.rewardItemCode}
                onChange={(e) => setForm({ ...form, rewardItemCode: e.target.value })} />
            </div>
          </SectionCard>

          <SectionCard icon={Eye} title="Visibility">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <span className="font-medium text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input type="checkbox" checked={form.isHidden}
                  onChange={(e) => setForm({ ...form, isHidden: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                <span className="font-medium text-sm">Hidden (not shown in public list)</span>
              </label>
            </div>
          </SectionCard>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={closeModal}>{t('cancel') || 'Cancel'}</Button>
            <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleSubmit}
              disabled={!form.code || !form.titleEn || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingAchievement ? (t('save') || 'Save Changes') : (t('create') || 'Create Achievement'))}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Achievement'}
        message={t('deleteConfirm') || 'Are you sure you want to delete this achievement?'}
        confirmText={t('confirm')} cancelText={t('cancel')} variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }} />
    </div>
  );
}
