'use client';

import { useState, useMemo, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { humanizeToken } from '@/shared/lib/labels';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gift,
  Plus,
  Inbox,
  Filter,
  X,
  Coins,
  Clock,
  Tag,
  Shield,
  ChevronDown,
  ChevronUp,
  Globe,
  Zap,
  Award,
  Gamepad2,
  Mic,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { MediaAssetIdUpload } from '@/shared/components/upload/MediaAssetIdUpload';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { ViewToggle } from '@/shared/components/ui/ViewToggle';
import { GiftCard, GiftTable } from '@/shared/components/store';
import { mediaService } from '@/services/media.service';
import { mediaPublicUrl } from '@/shared/lib/media-url';
import {
  giftsService,
  type GiftCatalogContext,
  type GiftCatalogEntry,
  type CreateGiftRequest,
  type UpdateGiftRequest,
} from '@/services/gifts.service';
import { useLanguage } from '@/components/language-context';
import { PageSkeleton } from '@/components/skeletons';
import { useHasPermission } from '@/hooks/usePermissions';
import {
  compareUnsignedIntegerStrings,
  formatIntegerString,
  sanitizeIntegerInput,
} from '@/shared/lib/money';
import {
  buildGiftCatalogCreateRequest,
  buildGiftCatalogUpdateRequest,
  giftCatalogFormError,
  GIFT_CONTEXT_PRESENTATION,
  type GiftCatalogFormData,
  type GiftGameType,
} from '@/shared/lib/gift-catalog-context';
import { MediaPreview } from '@/shared/components/media/MediaPreview';

const PAGE_SIZE = 24;

/** Reused verbatim by the filter bar so the offered values match the form. */
const emptyFilter = {
  status: '',
  category: '',
  rarity: '',
  minPrice: '',
  maxPrice: '',
  currency: '',
};

const CATEGORIES = [
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'event', label: 'Event' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'animated', label: 'Animated' },
  { value: 'exclusive_limited_time', label: 'Exclusive Limited' },
  { value: 'vip_exclusive', label: 'VIP Exclusive' },
  { value: 'room_exclusive', label: 'Room Exclusive' },
  { value: 'country_exclusive', label: 'Country Exclusive' },
];

const RARITIES = [
  { value: 'common', label: 'Common' },
  { value: 'rare', label: 'Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'mythic', label: 'Mythic' },
  { value: 'divine', label: 'Divine' },
];

const VISUAL_TYPES = [
  { value: 'static', label: 'Static' },
  { value: 'animated', label: 'Animated' },
  { value: 'lottie', label: 'Lottie' },
  { value: 'video', label: 'Video' },
  { value: 'combo', label: 'Combo' },
];

const BROADCAST_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'room', label: 'Room' },
  { value: 'zone', label: 'Zone' },
  { value: 'country', label: 'Country' },
  { value: 'regional', label: 'Regional' },
  { value: 'global', label: 'Global' },
];

const defaultForm: GiftCatalogFormData = {
  contextType: 'room' as GiftCatalogContext,
  code: '',
  name: '',
  description: '',
  iconMediaId: '',
  previewMediaId: '',
  animationMediaId: '',
  soundMediaId: '',
  stickerMediaId: '',
  metadataJson: '',
  allowedGameTypes: [],
  priceGameCurrency: '',
  category: 'basic',
  rarity: 'common',
  visualType: 'static',
  popularityPoints: 0,
  wealthPoints: 0,
  charmPoints: 0,
  reputationPoints: 0,
  roomContributionPoints: 0,
  roomExperiencePoints: 0,
  senderExperiencePoints: 0,
  receiverExperiencePoints: 0,
  broadcastLevel: 'none',
  displayPriority: 0,
  isActive: true,
  isLimitedTime: false,
  startsAt: '',
  endsAt: '',
  countryCode: '',
  roomId: '',
  vipLevelRequired: 0,
  eventId: '',
};

/**
 * Key-order-independent snapshot of the form. The persisted contract is every
 * `GiftCatalogFormData` key, so this is what Save compares against; it also
 * normalises nothing else — `''` vs `null` stays a real difference because the
 * update DTO treats an emptied field as "clear the column".
 */
function formSnapshot(value: GiftCatalogFormData): string {
  return JSON.stringify(value, (_key, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1)))
      : val,
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-pink-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
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
  const [catalogContext, setCatalogContext] = useState<GiftCatalogContext>('room');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState(emptyFilter);
  const [form, setForm] = useState(defaultForm);
  // Snapshot of the form as the server last had it, taken when the modal opens.
  // Save is dirty only against this, so a successful save that reopens the form
  // starts clean and a failure leaves the operator's edits in place.
  const [persistedForm, setPersistedForm] = useState(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);

  const isDirty = useMemo(
    () => formSnapshot(form) !== formSnapshot(persistedForm),
    [form, persistedForm],
  );

  // `category`/`rarity` are server query params (GiftCatalogQueryDto); `status`
  // and `price` narrow the loaded server page (no backend query for those).
  const {
    data: pageData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['gifts-catalog', catalogContext, page, filter.category, filter.rarity],
    // `contextType` is a real query param (GiftCatalogQueryDto) — filtering it
    // client-side over one server page would show an empty tab and bogus counts.
    queryFn: () =>
      giftsService.getCatalog({
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        contextType: catalogContext,
        category: filter.category || undefined,
        rarity: filter.rarity || undefined,
      }),
    placeholderData: (previous) => previous,
  });

  const catalog = useMemo(() => pageData?.items ?? [], [pageData]);

  // `iconMediaId` is a media_files uuid; the shared card/table need a URL.
  const unresolvedIconIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of catalog) {
      const id = entry.iconMediaId;
      if (id && !entry.icon) ids.add(id);
    }
    return Array.from(ids);
  }, [catalog]);

  const iconMediaQueries = useQueries({
    queries: unresolvedIconIds.map((id) => ({
      queryKey: ['media-file', id],
      queryFn: () => mediaService.getAdminFileById(id),
      staleTime: Infinity,
      retry: false,
    })),
  });

  const iconUrlById = useMemo(() => {
    const map = new Map<string, string>();
    unresolvedIconIds.forEach((id, index) => {
      const url = mediaPublicUrl(iconMediaQueries[index]?.data);
      if (url) map.set(id, url);
    });
    return map;
  }, [unresolvedIconIds, iconMediaQueries]);

  const resolved = useMemo(
    () =>
      catalog.map((entry) => {
        const resolvedIcon =
          entry.icon || (entry.iconMediaId ? iconUrlById.get(entry.iconMediaId) : undefined);
        return resolvedIcon && resolvedIcon !== entry.icon
          ? { ...entry, icon: resolvedIcon }
          : entry;
      }),
    [catalog, iconUrlById],
  );

  const filtered = useMemo(() => {
    let result = resolved;
    if (filter.status === 'active') result = result.filter((e) => e.isActive);
    if (filter.status === 'inactive') result = result.filter((e) => e.isActive === false);
    if (filter.category) result = result.filter((e) => e.category === filter.category);
    if (filter.rarity) result = result.filter((e) => e.rarity === filter.rarity);
    if (filter.currency === 'priced') result = result.filter((e) => e.priceGameCurrency != null);
    if (filter.currency === 'free') result = result.filter((e) => e.priceGameCurrency == null);
    if (filter.minPrice) {
      result = result.filter(
        (entry) =>
          entry.priceGameCurrency != null &&
          compareUnsignedIntegerStrings(entry.priceGameCurrency, filter.minPrice) >= 0,
      );
    }
    if (filter.maxPrice) {
      result = result.filter(
        (entry) =>
          entry.priceGameCurrency != null &&
          compareUnsignedIntegerStrings(entry.priceGameCurrency, filter.maxPrice) <= 0,
      );
    }
    return result;
  }, [resolved, filter]);

  // The delete state holds only an id (that is what the mutation and every call
  // site pass), but the confirmation has to show the gift the operator is about
  // to remove. Resolve it from the loaded page for DISPLAY only; a gift that has
  // left the page still deletes by id.
  const deleteTargetEntry = useMemo(
    () => (deleteTarget ? (filtered.find((entry) => entry.id === deleteTarget) ?? null) : null),
    [deleteTarget, filtered],
  );

  const activeFilters = Object.values(filter).filter((v) => v !== '').length;

  const total = pageData?.total ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  // The form is intentionally left untouched on failure: the operator keeps
  // every edit, sees the backend's own message, and Save stays available.
  const createMutation = useMutation({
    mutationFn: (data: CreateGiftRequest) => giftsService.createCatalogEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
      closeModal();
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGiftRequest }) =>
      giftsService.updateCatalogEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
      closeModal();
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => giftsService.deleteCatalogEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
      setDeleteTarget(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['gifts-catalog'] });
    },
  });

  const mutationError = (createMutation.error ?? updateMutation.error ?? deleteMutation.error) as {
    message?: string;
  } | null;
  const actionError = formError ?? mutationError?.message ?? null;

  const openCreate = () => {
    const next = { ...defaultForm, contextType: catalogContext };
    setEditing(null);
    setForm(next);
    setPersistedForm(next);
    setFormError(null);
    createMutation.reset();
    updateMutation.reset();
    setShowModal(true);
  };

  const openEdit = (entry: GiftCatalogEntry) => {
    const next: GiftCatalogFormData = {
      code: entry.code,
      contextType: entry.contextType,
      name: entry.titleI18n?.en || '',
      description: entry.descriptionI18n?.en || '',
      iconMediaId: entry.iconMediaId ?? entry.icon,
      previewMediaId: entry.previewMediaId ?? '',
      animationMediaId: entry.animationMediaId ?? '',
      soundMediaId: entry.soundMediaId ?? '',
      stickerMediaId: entry.stickerMediaId ?? '',
      // `metadata` is jsonb on the entity; show it as the object the operator
      // typed rather than a JS-literal, and never as `[object Object]`.
      metadataJson: entry.metadata ? JSON.stringify(entry.metadata, null, 2) : '',
      allowedGameTypes: entry.allowedGameTypes ?? [],
      priceGameCurrency: entry.priceGameCurrency ?? '',
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
    };
    setEditing(entry);
    setForm(next);
    setPersistedForm(next);
    setFormError(null);
    createMutation.reset();
    updateMutation.reset();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFormError(null);
  };

  // Client-side rules the DTO cannot express declaratively. Returning a reason
  // (instead of throwing from the request builder) keeps an invalid form from
  // escaping as an unhandled event error with no operator feedback.
  const handleSubmit = () => {
    const reason = giftCatalogFormError(form);
    setFormError(reason);
    if (reason) return;
    createMutation.reset();
    updateMutation.reset();
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: buildGiftCatalogUpdateRequest(form),
      });
    } else {
      createMutation.mutate(buildGiftCatalogCreateRequest(form));
    }
  };

  const toggleAllowedGameType = (gameType: GiftGameType) => {
    setForm((current) => ({
      ...current,
      allowedGameTypes: current.allowedGameTypes.includes(gameType)
        ? current.allowedGameTypes.filter((value) => value !== gameType)
        : [...current.allowedGameTypes, gameType],
    }));
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gift className="w-6 h-6 text-pink-500" />}
        title={t('giftsCatalog') || 'Gifts Catalog'}
        action={
          canManage
            ? {
                label: t('create') || 'Create',
                onClick: openCreate,
                icon: <Plus className="w-4 h-4" />,
              }
            : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="Gift catalog context">
        {[
          { value: 'room' as const, icon: Mic },
          { value: 'match' as const, icon: Gamepad2 },
        ].map((option) => {
          const Icon = option.icon;
          const active = catalogContext === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCatalogContext(option.value);
                setPage(1);
              }}
              className={`rounded-xl border p-3 text-start transition-colors ${
                active
                  ? 'border-pink-400 bg-pink-50 text-pink-900 ring-1 ring-pink-300 dark:bg-pink-500/10 dark:text-pink-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4" />
                <span className="font-mono uppercase">{option.value}</span>
                <span className="text-xs font-normal opacity-75">
                  {GIFT_CONTEXT_PRESENTATION[option.value].label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
              showFilters || activeFilters > 0
                ? 'bg-pink-50 border-pink-200 text-pink-700 dark:bg-pink-900/20 dark:border-pink-800 dark:text-pink-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            {t('filter') || 'Filter'}
            {activeFilters > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-pink-600 text-white rounded-full">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {filtered.length} {t('items') || 'items'}
            {total > 0 && (
              <span className="text-gray-400">
                {' '}
                · {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
            )}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500 px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <Select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            className="w-40"
          />
          <Select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            options={[{ value: '', label: 'All Categories' }, ...CATEGORIES]}
            className="w-48"
          />
          <Select
            value={filter.rarity}
            onChange={(e) => setFilter({ ...filter, rarity: e.target.value })}
            options={[{ value: '', label: 'All Rarities' }, ...RARITIES]}
            className="w-40"
          />
          <Select
            value={filter.currency}
            onChange={(e) => setFilter({ ...filter, currency: e.target.value })}
            options={[
              { value: '', label: 'All Prices' },
              { value: 'free', label: 'Free' },
              { value: 'priced', label: 'Priced' },
            ]}
            className="w-40"
          />
          <div className="flex items-center gap-2">
            <Input
              placeholder="Min price"
              type="number"
              value={filter.minPrice}
              onChange={(e) => setFilter({ ...filter, minPrice: e.target.value })}
              className="w-28"
            />
            <span className="text-gray-400">—</span>
            <Input
              placeholder="Max price"
              type="number"
              value={filter.maxPrice}
              onChange={(e) => setFilter({ ...filter, maxPrice: e.target.value })}
              className="w-28"
            />
          </div>
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(emptyFilter)}
              className="text-gray-500 hover:text-red-500"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((entry) => (
            <div key={entry.id} onClick={() => setViewing(entry)} className="cursor-pointer">
              <GiftCard
                entry={entry}
                canManage={canManage}
                onEdit={() => openEdit(entry)}
                onDelete={() => setDeleteTarget(entry.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <GiftTable
          entries={filtered}
          canManage={canManage}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onView={setViewing}
        />
      )}

      {isError ? (
        <QueryErrorNotice error={error} onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState message={t('noData') || 'No gifts'} icon={<Inbox className="w-10 h-10" />} />
      ) : null}

      <Modal
        isOpen={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.titleI18n?.en || viewing?.code || 'Gift'}
        size="lg"
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-pink-50 to-rose-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                {viewing.icon ? (
                  <MediaPreview url={viewing.icon} alt="" className="w-16 h-16 object-contain" />
                ) : (
                  <Gift className="w-10 h-10 text-pink-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant={viewing.isActive ? 'success' : 'danger'}>
                    {viewing.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">
                    {GIFT_CONTEXT_PRESENTATION[viewing.contextType].label}
                  </Badge>
                  {viewing.rarity && (
                    <Badge variant="outline" className="text-xs">
                      {humanizeToken(viewing.rarity)}
                    </Badge>
                  )}
                  {viewing.category && (
                    <Badge variant="outline" className="text-xs">
                      {humanizeToken(viewing.category)}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {viewing.titleI18n?.en || humanizeToken(viewing.code)}
                </h3>
                <p className="text-sm text-gray-500 font-mono">{viewing.code}</p>
              </div>
            </div>

            {viewing.descriptionI18n?.en && (
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="text-gray-900 dark:text-white mt-1">{viewing.descriptionI18n.en}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">
                  <Coins className="w-3 h-3 inline text-emerald-500" /> GAME_CURRENCY
                </p>
                <p className="font-medium">
                  {viewing.priceGameCurrency != null
                    ? formatIntegerString(viewing.priceGameCurrency)
                    : 'Free'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Visual</p>
                <p className="font-medium capitalize">{viewing.visualType || 'static'}</p>
              </div>
              {viewing.broadcastLevel && viewing.broadcastLevel !== 'none' && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">
                    <Globe className="w-3 h-3 inline" /> Broadcast
                  </p>
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
                  <p className="text-xs text-gray-500 mb-1">
                    <Clock className="w-3 h-3 inline" /> Created
                  </p>
                  <p className="font-medium text-sm">
                    {new Date(viewing.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {viewing.contextType === 'match' &&
              viewing.allowedGameTypes &&
              viewing.allowedGameTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-xs text-gray-500">allowedGameTypes</span>
                  {viewing.allowedGameTypes.map((gameType) => (
                    <Badge key={gameType} variant="outline" className="text-xs capitalize">
                      {gameType}
                    </Badge>
                  ))}
                </div>
              )}

            {viewing.stickerMediaId && (
              <div>
                <label className="text-sm font-medium text-gray-500">stickerMediaId</label>
                <p className="text-gray-900 dark:text-white font-mono text-xs break-all">
                  {viewing.stickerMediaId}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewing(null);
                      openEdit(viewing);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setViewing(null);
                      setDeleteTarget(viewing.id);
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
              <Button variant="ghost" onClick={() => setViewing(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editing ? t('edit') || 'Edit Gift' : t('create') || 'Create Gift'}
        size="lg"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <SectionCard icon={Tag} title="Basic Information">
            <Select
              label="Context *"
              value={form.contextType}
              onChange={(event) =>
                setForm({
                  ...form,
                  contextType: event.target.value as GiftCatalogContext,
                })
              }
              options={[
                { value: 'room', label: 'room' },
                { value: 'match', label: 'match' },
              ]}
            />
            <Input
              label="Slug *"
              placeholder="gift_slug"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!!editing}
            />
            <Input
              label="Name *"
              placeholder="Gift name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Description"
              placeholder="Gift description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </SectionCard>

          <SectionCard icon={Shield} title="Classification & Visual">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Category *"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                options={CATEGORIES}
              />
              <Select
                label="Rarity *"
                value={form.rarity}
                onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                options={RARITIES}
              />
            </div>
            <Select
              label="Visual Type"
              value={form.visualType}
              onChange={(e) => setForm({ ...form, visualType: e.target.value })}
              options={VISUAL_TYPES}
            />
            <MediaAssetIdUpload
              label="Icon asset"
              value={form.iconMediaId}
              onChange={(v) => setForm({ ...form, iconMediaId: v })}
            />
            <MediaAssetIdUpload
              label="Preview asset"
              value={form.previewMediaId}
              onChange={(v) => setForm({ ...form, previewMediaId: v })}
            />
            {/* `visualType` selects the renderer; `animationMediaId` is the asset
                that renderer needs, so only offer it for the animated types. */}
            {form.visualType !== 'static' && (
              <MediaAssetIdUpload
                label="Animation asset"
                profile="giftAnimation"
                acceptLabel="Animation (.gif/.webp/.avif/.mp4/.webm/.lottie/.riv/.svga)"
                value={form.animationMediaId}
                onChange={(v) => setForm({ ...form, animationMediaId: v })}
              />
            )}
            <MediaAssetIdUpload
              label="Sound asset"
              profile="giftSound"
              value={form.soundMediaId}
              onChange={(v) => setForm({ ...form, soundMediaId: v })}
            />
            {form.contextType === 'match' && (
              <>
                <MediaAssetIdUpload
                  label="Sticker asset *"
                  value={form.stickerMediaId}
                  onChange={(value) => setForm({ ...form, stickerMediaId: value })}
                />
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    allowedGameTypes
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {(['ludo', 'domino'] as const).map((gameType) => (
                      <label
                        key={gameType}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={form.allowedGameTypes.includes(gameType)}
                          onChange={() => toggleAllowedGameType(gameType)}
                        />
                        <span className="capitalize">{gameType}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
          </SectionCard>

          <SectionCard icon={Coins} title="Pricing & Display">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Price (game currency) *"
                type="text"
                inputMode="numeric"
                value={form.priceGameCurrency}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priceGameCurrency: sanitizeIntegerInput(e.target.value),
                  })
                }
                icon={<Coins className="w-4 h-4 text-emerald-500" />}
              />
              <Input
                label="Display priority"
                type="number"
                value={form.displayPriority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    displayPriority: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </SectionCard>

          {form.contextType === 'room' && (
            <SectionCard icon={Zap} title="Points">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Popularity points"
                  type="number"
                  value={form.popularityPoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      popularityPoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Wealth points"
                  type="number"
                  value={form.wealthPoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      wealthPoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Charm points"
                  type="number"
                  value={form.charmPoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      charmPoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Reputation points"
                  type="number"
                  value={form.reputationPoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      reputationPoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </SectionCard>
          )}

          {form.contextType === 'room' && (
            <SectionCard icon={Award} title="Experience & Contribution Points">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input
                  label="Sender XP"
                  type="number"
                  value={form.senderExperiencePoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      senderExperiencePoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Receiver XP"
                  type="number"
                  value={form.receiverExperiencePoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      receiverExperiencePoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Room contribution points"
                  type="number"
                  value={form.roomContributionPoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      roomContributionPoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <Input
                  label="Room XP"
                  type="number"
                  value={form.roomExperiencePoints}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      roomExperiencePoints: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </SectionCard>
          )}

          <SectionCard icon={Clock} title="Availability & Scheduling">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="font-medium text-sm">isActive</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <input
                  type="checkbox"
                  checked={form.isLimitedTime}
                  onChange={(e) => setForm({ ...form, isLimitedTime: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="font-medium text-sm">isLimitedTime</span>
              </label>
            </div>
            {form.isLimitedTime && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Starts at"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
                <Input
                  label="Ends at"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            )}
            <Select
              label="Broadcast level"
              value={form.broadcastLevel}
              disabled={form.contextType === 'match'}
              onChange={(e) => setForm({ ...form, broadcastLevel: e.target.value })}
              options={BROADCAST_LEVELS}
            />
          </SectionCard>

          <SectionCard icon={Globe} title="Restrictions & Targeting" defaultOpen={false}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Country code (ISO 2)"
                placeholder="SA, US, EG..."
                maxLength={2}
                value={form.countryCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    countryCode: e.target.value.toUpperCase().slice(0, 2),
                  })
                }
              />
              <Input
                label="Minimum VIP level"
                type="number"
                value={form.vipLevelRequired}
                onChange={(e) =>
                  setForm({
                    ...form,
                    vipLevelRequired: parseInt(e.target.value) || 0,
                  })
                }
              />
              {form.contextType === 'room' && (
                <Input
                  label="Room (UUID)"
                  placeholder="uuid"
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                />
              )}
              <Input
                label="Event (UUID)"
                placeholder="uuid"
                value={form.eventId}
                onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              />
            </div>
            {/* `metadata` is a jsonb column the DTO validates with @IsObject(), so
                it is edited as JSON text. The builder parses it; an empty box
                clears the column on update instead of writing "". */}
            <div>
              <label
                htmlFor="gift-metadata"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                metadata (JSON object)
              </label>
              <textarea
                id="gift-metadata"
                rows={4}
                spellCheck={false}
                placeholder={'{\n  "key": "value"\n}'}
                value={form.metadataJson}
                onChange={(e) => setForm({ ...form, metadataJson: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </SectionCard>

          {actionError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {actionError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={closeModal}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              className="flex-1 bg-pink-600 hover:bg-pink-700"
              onClick={handleSubmit}
              disabled={
                !isDirty ||
                giftCatalogFormError(form) !== null ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editing
                  ? t('save') || 'Save Changes'
                  : t('create') || 'Create Gift'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* The confirmation must show WHICH gift is being removed. It previously
          said only "Are you sure?" with no name and no media, so an operator
          could not tell what they were about to delete. */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('delete') || 'Delete Gift'}
        confirmText={t('confirm')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      >
        <div className="space-y-3">
          {deleteTargetEntry && (
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-pink-50 dark:bg-gray-800">
                <MediaPreview
                  url={deleteTargetEntry.icon}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900 dark:text-white">
                  {deleteTargetEntry.titleI18n?.en || humanizeToken(deleteTargetEntry.code)}
                </p>
                <p className="truncate font-mono text-xs text-gray-500">{deleteTargetEntry.code}</p>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Removes this gift from the catalog. Gifts that were already sent keep their transaction
            history and are unpublished instead of deleted.
          </p>
          {deleteMutation.error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {(deleteMutation.error as { message?: string }).message ||
                'The gift could not be deleted.'}
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}
