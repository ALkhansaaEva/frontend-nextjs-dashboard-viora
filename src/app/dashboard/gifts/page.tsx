'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift, Plus, Inbox, Filter, X, Coins, Gem, Clock, Tag, Shield,
  ChevronDown, ChevronUp, Eye, Globe, Zap, Award,
} from 'lucide-react';
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
import { GiftCard, GiftTable } from '@/shared/components/store';
import { giftsService, type GiftCatalogEntry, type CreateGiftRequest, type UpdateGiftRequest } from '@/services/gifts.service';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks/usePermissions';

const CATEGORIES = [
  { value: 'basic', label: 'Basic' }, { value: 'premium', label: 'Premium' },
  { value: 'romantic', label: 'Romantic' }, { value: 'luxury', label: 'Luxury' },
  { value: 'legendary', label: 'Legendary' }, { value: 'event', label: 'Event' },
  { value: 'seasonal', label: 'Seasonal' }, { value: 'animated', label: 'Animated' },
  { value: 'exclusive_limited_time', label: 'Exclusive Limited' },
  { value: 'vip_exclusive', label: 'VIP Exclusive' },
  { value: 'room_exclusive', label: 'Room Exclusive' },
  { value: 'country_exclusive', label: 'Country Exclusive' },
];

const RARITIES = [
  { value: 'common', label: 'Common' }, { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' }, { value: 'legendary', label: 'Legendary' },
  { value: 'mythic', label: 'Mythic' }, { value: 'divine', label: 'Divine' },
];

const VISUAL_TYPES = [
  { value: 'static', label: 'Static' }, { value: 'animated', label: 'Animated' },
  { value: 'lottie', label: 'Lottie' }, { value: 'video', label: 'Video' },
  { value: 'combo', label: 'Combo' },
];

const BROADCAST_LEVELS = [
  { value: 'none', label: 'None' }, { value: 'room', label: 'Room' },
  { value: 'zone', label: 'Zone' }, { value: 'country', label: 'Country' },
  { value: 'regional', label: 'Regional' }, { value: 'global', label: 'Global' },
];

const defaultForm = {
  code: '', titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '',
  icon: '', priceGems: 0, priceCoins: 0,
  category: 'basic', rarity: 'common', visualType: 'static',
  popularityPoints: 0, wealthPoints: 0, charmPoints: 0, reputationPoints: 0,
  roomContributionPoints: 0, roomExperiencePoints: 0,
  senderExperiencePoints: 0, receiverExperiencePoints: 0,
  broadcastLevel: 'none', displayPriority: 0,
  isActive: true, isLimitedTime: false,
  startsAt: '', endsAt: '',
  countryCode: '', roomId: '', vipLevelRequired: 0, eventId: '',
  stock: 0,
};

function SectionCard({ icon: Icon, title, children, defaultOpen = true }: { icon: any; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function GiftsPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  // store.catalog_manage is the real canonical permission gating the gift-catalog CRUD
  // endpoints (POST/PATCH/DELETE gifts/admin/catalog) — see BACKEND_CAPABILITY_REGISTRY.md §8.
  const canManage = useHasPermission()('store.catalog_manage');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<GiftCatalogEntry | null>(null);
  const [viewing, setViewing] = useState<GiftCatalogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState({ status: '', minPrice: '', maxPrice: '', currency: '' });
  const [form, setForm] = useState(defaultForm);

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['gifts-catalog'],
    queryFn: () => giftsService.getCatalog(),
  });

  const filtered = useMemo(() => {
    let result = catalog;
    if (filter.status === 'active') result = result.filter((e) => e.isActive);
    if (filter.status === 'inactive') result = result.filter((e) => e.isActive === false);
    if (filter.currency === 'gems') result = result.filter((e) => e.priceGems > 0);
    if (filter.currency === 'coins') result = result.filter((e) => e.priceCoins > 0);
    if (filter.currency === 'free') result = result.filter((e) => e.priceGems === 0 && e.priceCoins === 0);
    if (filter.minPrice) {
      const min = parseInt(filter.minPrice);
      if (!isNaN(min)) result = result.filter((e) => e.priceCoins >= min || e.priceGems >= min);
    }
    if (filter.maxPrice) {
      const max = parseInt(filter.maxPrice);
      if (!isNaN(max)) result = result.filter((e) => e.priceCoins <= max || e.priceGems <= max);
    }
    return result;
  }, [catalog, filter]);

  const activeFilters = Object.values(filter).filter((v) => v !== '').length;

  const createMutation = useMutation({
    mutationFn: (data: CreateGiftRequest) => giftsService.createCatalogEntry(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGiftRequest }) => giftsService.updateCatalogEntry(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => giftsService.deleteCatalogEntry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] }); setDeleteTarget(null); },
  });

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (entry: GiftCatalogEntry) => {
    setEditing(entry);
    setForm({
      code: entry.code,
      titleEn: entry.titleI18n?.en || '',
      titleAr: Object.values(entry.titleI18n || {}).filter(v => v !== entry.titleI18n?.en).join(', '),
      descriptionEn: entry.descriptionI18n?.en || '',
      descriptionAr: Object.values(entry.descriptionI18n || {}).filter(v => v !== entry.descriptionI18n?.en).join(', '),
      icon: entry.icon,
      priceGems: entry.priceGems,
      priceCoins: entry.priceCoins,
      category: entry.category || 'basic',
      rarity: entry.rarity || 'common',
      visualType: entry.visualType || 'static',
      popularityPoints: entry.popularityPoints ?? 0,
      wealthPoints: entry.wealthPoints ?? 0,
      charmPoints: entry.charmPoints ?? 0,
      reputationPoints: entry.reputationPoints ?? 0,
      roomContributionPoints: entry.roomContributionPoints ?? 0,
      roomExperiencePoints: entry.roomExperiencePoints ?? 0,
      senderExperiencePoints: entry.senderExperiencePoints ?? 0,
      receiverExperiencePoints: entry.receiverExperiencePoints ?? 0,
      broadcastLevel: entry.broadcastLevel || 'none',
      displayPriority: entry.displayPriority ?? 0,
      isActive: entry.isActive,
      isLimitedTime: entry.isLimitedTime ?? false,
      startsAt: entry.startsAt || '',
      endsAt: entry.endsAt || '',
      countryCode: entry.countryCode || '',
      roomId: entry.roomId || '',
      vipLevelRequired: entry.vipLevelRequired ?? 0,
      eventId: entry.eventId || '',
      stock: entry.stock,
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const buildPayload = () => {
    const titleI18n: Record<string, string> = { en: form.titleEn };
    if (form.titleAr) titleI18n.ar = form.titleAr;
    const descriptionI18n: Record<string, string> = {};
    if (form.descriptionEn) descriptionI18n.en = form.descriptionEn;
    if (form.descriptionAr) descriptionI18n.ar = form.descriptionAr;

    return {
      code: form.code,
      titleI18n,
      descriptionI18n: Object.keys(descriptionI18n).length > 0 ? descriptionI18n : undefined,
      icon: form.icon || undefined,
      priceGems: form.priceGems || undefined,
      priceCoins: form.priceCoins || undefined,
      category: form.category,
      rarity: form.rarity,
      visualType: form.visualType,
      popularityPoints: form.popularityPoints,
      wealthPoints: form.wealthPoints,
      charmPoints: form.charmPoints,
      reputationPoints: form.reputationPoints,
      roomContributionPoints: form.roomContributionPoints,
      roomExperiencePoints: form.roomExperiencePoints,
      senderExperiencePoints: form.senderExperiencePoints,
      receiverExperiencePoints: form.receiverExperiencePoints,
      broadcastLevel: form.broadcastLevel,
      displayPriority: form.displayPriority,
      isActive: form.isActive,
      isLimitedTime: form.isLimitedTime,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
      countryCode: form.countryCode || undefined,
      roomId: form.roomId || undefined,
      vipLevelRequired: form.vipLevelRequired,
      eventId: form.eventId || undefined,
      stock: form.stock || undefined,
    };
  };

  const handleSubmit = () => {
    const payload = buildPayload();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload as UpdateGiftRequest });
    } else {
      createMutation.mutate(payload as CreateGiftRequest);
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gift className="w-6 h-6 text-pink-500" />}
        title={t('giftsCatalog') || 'Gifts Catalog'}
        action={{ label: t('create') || 'Create', onClick: openCreate, icon: <Plus className="w-4 h-4" /> }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
              showFilters || activeFilters > 0
                ? 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <Filter className="w-4 h-4" />
            {t('filter') || 'Filter'}
            {activeFilters > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-pink-600 text-white rounded-full">{activeFilters}</span>}
          </button>
        </div>
        <p className="text-sm text-gray-500">{filtered.length} / {catalog.length} {t('items') || 'items'}</p>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <Select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            options={[{ value: '', label: 'All Statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} className="w-40" />
          <Select value={filter.currency} onChange={(e) => setFilter({ ...filter, currency: e.target.value })}
            options={[{ value: '', label: 'All Prices' }, { value: 'free', label: 'Free' }, { value: 'coins', label: 'Has Gold Price' }, { value: 'gems', label: 'Has Gems Price' }]} className="w-40" />
          <div className="flex items-center gap-2">
            <Input placeholder="Min price" type="number" value={filter.minPrice}
              onChange={(e) => setFilter({ ...filter, minPrice: e.target.value })} className="w-28" />
            <span className="text-gray-400">—</span>
            <Input placeholder="Max price" type="number" value={filter.maxPrice}
              onChange={(e) => setFilter({ ...filter, maxPrice: e.target.value })} className="w-28" />
          </div>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilter({ status: '', minPrice: '', maxPrice: '', currency: '' })}
              className="text-gray-500 hover:text-red-500"><X className="w-4 h-4 mr-1" /> Clear</Button>
          )}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((entry) => (
            <div key={entry.id} onClick={() => setViewing(entry)} className="cursor-pointer">
              <GiftCard entry={entry} canManage={canManage} onEdit={() => openEdit(entry)} onDelete={() => setDeleteTarget(entry.id)} />
            </div>
          ))}
        </div>
      ) : (
        <GiftTable entries={filtered} canManage={canManage} onEdit={openEdit} onDelete={setDeleteTarget} onView={setViewing} />
      )}

      {filtered.length === 0 && <EmptyState message={t('noData') || 'No gifts'} icon={<Inbox className="w-10 h-10" />} />}

      <Modal isOpen={!!viewing} onClose={() => setViewing(null)} title={viewing?.titleI18n?.en || viewing?.code || 'Gift'} size="lg">
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                {viewing.icon ? <img src={viewing.icon} alt="" className="w-16 h-16 object-contain" /> : <Gift className="w-10 h-10 text-pink-500" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={viewing.isActive ? 'success' : 'danger'}>{viewing.isActive ? 'Active' : 'Inactive'}</Badge>
                  {viewing.rarity && <Badge variant="outline" className="text-xs capitalize">{viewing.rarity}</Badge>}
                  {viewing.category && <Badge variant="outline" className="text-xs capitalize">{viewing.category}</Badge>}
                </div>
                <h3 className="text-xl font-bold">{viewing.titleI18n?.en || viewing.code}</h3>
                <p className="text-sm text-gray-500 font-mono">{viewing.code}</p>
              </div>
            </div>

            {viewing.descriptionI18n?.en && (
              <div><label className="text-sm font-medium text-gray-500">Description</label><p className="text-gray-900 dark:text-white mt-1">{viewing.descriptionI18n.en}</p></div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1"><Coins className="w-3 h-3 inline text-yellow-500" /> Gold</p>
                <p className="font-medium">{viewing.priceCoins || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1"><Gem className="w-3 h-3 inline text-purple-500" /> Gems</p>
                <p className="font-medium">{viewing.priceGems || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Stock</p>
                <p className="font-medium">{viewing.stock > 0 ? viewing.stock : 'Unlimited'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Visual</p>
                <p className="font-medium capitalize">{viewing.visualType || 'static'}</p>
              </div>
              {viewing.broadcastLevel && viewing.broadcastLevel !== 'none' && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1"><Globe className="w-3 h-3 inline" /> Broadcast</p>
                  <p className="font-medium capitalize">{viewing.broadcastLevel}</p>
                </div>
              )}
              {viewing.displayPriority ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Priority</p>
                  <p className="font-medium">{viewing.displayPriority}</p>
                </div>
              ) : null}
              {viewing.createdAt && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1"><Clock className="w-3 h-3 inline" /> Created</p>
                  <p className="font-medium text-sm">{new Date(viewing.createdAt).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canManage && (
                <>
                  <Button variant="outline" onClick={() => { setViewing(null); openEdit(viewing); }}>Edit</Button>
                  <Button variant="danger" onClick={() => { setViewing(null); setDeleteTarget(viewing.id); }}>Delete</Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showModal} onClose={closeModal}
        title={editing ? (t('edit') || 'Edit Gift') : (t('create') || 'Create Gift')} size="lg">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <SectionCard icon={Tag} title="Basic Information">
            <Input label="Code *" placeholder="gift_code" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Title (EN) *" placeholder="Gift Name" value={form.titleEn}
                onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
              <Input label="Title (AR)" placeholder="اسم الهدية" value={form.titleAr}
                onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Description (EN)" placeholder="Gift description" value={form.descriptionEn}
                onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })} />
              <Input label="Description (AR)" placeholder="وصف الهدية" value={form.descriptionAr}
                onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })} />
            </div>
          </SectionCard>

          <SectionCard icon={Shield} title="Classification & Visual">
            <div className="grid grid-cols-2 gap-3">
              <Select label="Category *" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES} />
              <Select label="Rarity *" value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value })} options={RARITIES} />
            </div>
            <Select label="Visual Type" value={form.visualType}
              onChange={(e) => setForm({ ...form, visualType: e.target.value })} options={VISUAL_TYPES} />
            <FileUpload profile="gift" label="Icon / Media" placeholder="Icon URL or upload" value={form.icon}
              onChange={(v) => setForm({ ...form, icon: v })} />
          </SectionCard>

          <SectionCard icon={Gem} title="Pricing & Display">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Price (Gold)" type="number" value={form.priceCoins}
                onChange={(e) => setForm({ ...form, priceCoins: parseInt(e.target.value) || 0 })}
                icon={<Coins className="w-4 h-4 text-yellow-500" />} />
              <Input label="Price (Gems)" type="number" value={form.priceGems}
                onChange={(e) => setForm({ ...form, priceGems: parseInt(e.target.value) || 0 })}
                icon={<Gem className="w-4 h-4 text-purple-500" />} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Stock (0 = unlimited)" type="number" value={form.stock}
                onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })} />
              <Input label="Display Priority" type="number" value={form.displayPriority}
                onChange={(e) => setForm({ ...form, displayPriority: parseInt(e.target.value) || 0 })} />
            </div>
          </SectionCard>

          <SectionCard icon={Zap} title="Social Impact Points">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input label="Popularity" type="number" value={form.popularityPoints}
                onChange={(e) => setForm({ ...form, popularityPoints: parseInt(e.target.value) || 0 })} />
              <Input label="Wealth" type="number" value={form.wealthPoints}
                onChange={(e) => setForm({ ...form, wealthPoints: parseInt(e.target.value) || 0 })} />
              <Input label="Charm" type="number" value={form.charmPoints}
                onChange={(e) => setForm({ ...form, charmPoints: parseInt(e.target.value) || 0 })} />
              <Input label="Reputation" type="number" value={form.reputationPoints}
                onChange={(e) => setForm({ ...form, reputationPoints: parseInt(e.target.value) || 0 })} />
            </div>
          </SectionCard>

          <SectionCard icon={Award} title="Experience Points">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input label="Sender XP" type="number" value={form.senderExperiencePoints}
                onChange={(e) => setForm({ ...form, senderExperiencePoints: parseInt(e.target.value) || 0 })} />
              <Input label="Receiver XP" type="number" value={form.receiverExperiencePoints}
                onChange={(e) => setForm({ ...form, receiverExperiencePoints: parseInt(e.target.value) || 0 })} />
              <Input label="Room Contribution" type="number" value={form.roomContributionPoints}
                onChange={(e) => setForm({ ...form, roomContributionPoints: parseInt(e.target.value) || 0 })} />
              <Input label="Room Experience" type="number" value={form.roomExperiencePoints}
                onChange={(e) => setForm({ ...form, roomExperiencePoints: parseInt(e.target.value) || 0 })} />
            </div>
          </SectionCard>

          <SectionCard icon={Eye} title="Availability & Scheduling">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                <span className="font-medium text-sm">Active in catalog</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input type="checkbox" checked={form.isLimitedTime}
                  onChange={(e) => setForm({ ...form, isLimitedTime: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                <span className="font-medium text-sm">Limited time</span>
              </label>
            </div>
            {form.isLimitedTime && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Start Date" type="datetime-local" value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                <Input label="End Date" type="datetime-local" value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            )}
            <Select label="Broadcast Level" value={form.broadcastLevel}
              onChange={(e) => setForm({ ...form, broadcastLevel: e.target.value })} options={BROADCAST_LEVELS} />
          </SectionCard>

          <SectionCard icon={Globe} title="Restrictions & Targeting" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Country Code (ISO2)" placeholder="SA, US, EG..." maxLength={2}
                value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase().slice(0, 2) })} />
              <Input label="VIP Level Required" type="number" value={form.vipLevelRequired}
                onChange={(e) => setForm({ ...form, vipLevelRequired: parseInt(e.target.value) || 0 })} />
              <Input label="Room ID" placeholder="uuid" value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })} />
              <Input label="Event ID" placeholder="uuid" value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })} />
            </div>
          </SectionCard>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={closeModal}>{t('cancel') || 'Cancel'}</Button>
            <Button className="flex-1 bg-pink-600 hover:bg-pink-700" onClick={handleSubmit}
              disabled={!form.code || !form.titleEn || createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editing ? (t('save') || 'Save Changes') : (t('create') || 'Create Gift'))}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Gift'} message={t('deleteConfirm') || 'Are you sure?'}
        confirmText={t('confirm')} cancelText={t('cancel')} variant="danger"
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget); }} />
    </div>
  );
}
