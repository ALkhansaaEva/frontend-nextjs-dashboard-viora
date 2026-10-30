'use client';

import { useState } from 'react';
import { QueryErrorNotice } from '@/shared/components/ui/QueryState';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Package, Plus, LayoutGrid, List, Filter, X, Search, Coins } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';

import { Select } from '@/shared/components/ui/Select';
import { storeService } from '@/services';
import { useHasPermission } from '@/hooks';
import { TableSkeleton } from '@/components/skeletons';
import { useLanguage } from '@/components/language-context';
import { formatIntegerString } from '@/shared/lib/money';
import type { StoreItem } from '@/services/store.service';
import { ItemBadgePicker } from '@/shared/components/rewards/ItemBadgePicker';
import type { PaginatedResponse } from '@/types';
import type { CreateStoreItemRequest, CreateStoreBundleRequest } from '@/dto/store';
import { CreateItemForm, CreateBundleForm, StoreItemCard, StoreItemTable, BundleCard, ItemDetailContent } from '@/shared/components/store';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { storeItemSlotLabel, STORE_ITEM_SLOTS } from '@/shared/lib/store-item-types';
import { MediaPreview } from '@/shared/components/media/MediaPreview';
import { storeItemImageUrl } from '@/shared/lib/media-url';
import { humanizeToken } from '@/shared/lib/labels';


export default function StorePage() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  // Canonical backend permission — StoreController's admin item/bundle
  // mutation routes require store.write ('manage_store'/'view_transactions'
  // are legacy bitmask codes the backend no longer grants under canonical RBAC).
  const canManageStore = hasPermission('store.write');
  
  const [activeTab, setActiveTab] = useState<'items' | 'bundles'>('items');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  // Default to active-only. `deleteItemAdmin` soft-deletes (isActive=false), so
  // an unfiltered list keeps showing the deleted row and the Delete button looks
  // like it did nothing. The filter dropdown still exposes All / Inactive.
  const [filter, setFilter] = useState({ isActive: 'true', scope: '', gameType: '', slot: '' });
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  // Delete is destructive, so it is never fired from a click: the target is
  // parked here and only the ConfirmDialog confirmation calls the mutation.
  const [deleteTarget, setDeleteTarget] = useState<StoreItem | null>(null);
  const [bundleDetailId, setBundleDetailId] = useState<string | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateBundle, setShowCreateBundle] = useState(false);
  const [editingBundle, setEditingBundle] = useState<{ id: string; titleEn: string; titleAr: string; priceGameCurrency: string; isActive: boolean } | null>(null);
  const [addItemId, setAddItemId] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const [activeFilters, setActiveFilters] = useState(0);

  // ponytail: 100 is the backend's own clamp (getAllItemsAdmin/getAllBundlesAdmin
  // cap limit at 100). Add pagination when the catalog outgrows one page.
  const { data: itemsPage, isLoading: itemsLoading, isError: itemsIsError, error: itemsError, refetch: itemsRefetch } = useQuery({
    queryKey: ['store', 'items', filter, search],
    queryFn: () => storeService.getAdminItems({
      limit: 100,
      ...(filter.isActive ? { isActive: filter.isActive === 'true' } : {}),
      ...(filter.scope ? { scope: filter.scope } : {}),
      ...(filter.gameType ? { gameType: filter.gameType } : {}),
      ...(filter.slot ? { slot: filter.slot } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
    }),
    staleTime: 30000,
  });
  const items = itemsPage?.data ?? [];

  const { data: bundlesPage, isLoading: bundlesLoading, isError: bundlesIsError, error: bundlesError, refetch: bundlesRefetch } = useQuery({
    queryKey: ['store', 'bundles'],
    queryFn: () => storeService.getAdminBundles({ limit: 100 }),
    staleTime: 30000,
  });
  const bundles = bundlesPage?.data ?? [];

  // The bundle list does not guarantee hydrated `items[]`, so the detail modal
  // re-reads the single bundle by id — the only bundle-by-id route that exists.
  const { data: bundleDetail, isLoading: bundleDetailLoading, isError: bundleDetailIsError, error: bundleDetailError, refetch: bundleDetailRefetch } = useQuery({
    queryKey: ['store', 'bundles', bundleDetailId],
    queryFn: () => storeService.getAdminBundleById(bundleDetailId!),
    enabled: !!bundleDetailId,
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStoreItemRequest> }) => storeService.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'], refetchType: 'all' });
      setEditingItem(null);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'], refetchType: 'all' });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: (data: CreateStoreItemRequest) => storeService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] });
      setShowCreateItem(false);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] });
    },
  });

  const createBundleMutation = useMutation({
    mutationFn: (data: CreateStoreBundleRequest) => storeService.createBundle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'bundles'] });
      setShowCreateBundle(false);
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'bundles'] });
    },
  });

  const updateBundleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateStoreBundleRequest> }) =>
      storeService.updateBundle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'bundles'] });
      setEditingBundle(null);
      void bundleDetailRefetch();
    },
  });

  const addBundleItemMutation = useMutation({
    mutationFn: ({ bundleId, itemId }: { bundleId: string; itemId: string }) =>
      storeService.addItemToBundle(bundleId, { itemId, quantity: addItemQty }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'bundles'] });
      void bundleDetailRefetch();
      setAddItemId('');
      setAddItemQty(1);
    },
  });

  const removeBundleItemMutation = useMutation({
    mutationFn: ({ bundleId, itemId }: { bundleId: string; itemId: string }) =>
      storeService.removeItemFromBundle(bundleId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'bundles'] });
      void bundleDetailRefetch();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => storeService.deleteItem(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['store', 'items'] });
      const previousItems = queryClient.getQueryData<PaginatedResponse<StoreItem>>(['store', 'items', filter, search]);
      // The list cache holds the whole page envelope, not a bare array.
      queryClient.setQueryData<PaginatedResponse<StoreItem>>(['store', 'items', filter, search], (old) =>
        old ? { ...old, data: old.data.filter((item) => item.id !== id) } : old
      );
      setSelectedItem(null);
      return { previousItems };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['store', 'items', filter, search], context?.previousItems);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['store', 'items'] });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilter = { ...filter, [key]: value };
    setFilter(newFilter);
    setActiveFilters(Object.values(newFilter).filter(v => v !== '').length);
  };

  const clearFilters = () => {
    setFilter({ isActive: 'true', scope: '', gameType: '', slot: '' });
    setActiveFilters(0);
  };

  // No page-wide early return: a slow/failed bundles request must not blank the
  // items tab (and vice versa). Each tab owns its own loading/error/empty state.

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('store') || 'Store'}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('storeDesc') || 'Manage store items and bundles'}</p>
          </div>
        </div>
        {canManageStore && (
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateItem(true)} size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4 mr-1.5" /> {t('newItem') || 'New Item'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateBundle(true)} size="sm">
              <Package className="w-4 h-4 mr-1.5" /> {t('newBundle') || 'New Bundle'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'items' 
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' 
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <Package className="w-4 h-4" />
            {t('items') || 'Items'}
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">{items.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('bundles')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'bundles' 
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' 
                : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {t('bundles') || 'Bundles'}
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">{bundles.length}</span>
          </button>
        </div>
        
        {activeTab === 'items' && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code or title…"
                aria-label="Search store items"
                className="w-48 pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow text-violet-600' : 'text-gray-400 hover:text-gray-600'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
                showFilters || activeFilters > 0 
                  ? 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300' 
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              {t('filter') || 'Filter'}
              {activeFilters > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-violet-600 text-white rounded-full">{activeFilters}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {showFilters && activeTab === 'items' && (
        <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-2">
          <Select
            value={filter.isActive}
            onChange={(e) => handleFilterChange('isActive', e.target.value)}
            options={[
              { value: '', label: t('all') },
              { value: 'true', label: t('active') },
              { value: 'false', label: t('inactive') },
            ]}
            className="w-40"
          />
          <Select 
            value={filter.scope} 
            onChange={(e) => handleFilterChange('scope', e.target.value)} 
            options={[
              { value: '', label: t('allScopes') || 'All Scopes' },
              { value: 'profile', label: '👤 Profile' },
              { value: 'game', label: '🎮 Game' },
              { value: 'room', label: '🏠 Room' },
            ]} 
            className="w-40" 
          />
          <Select 
            value={filter.gameType} 
            onChange={(e) => handleFilterChange('gameType', e.target.value)} 
            options={[
              { value: '', label: t('allGames') || 'All Games' },
              { value: 'ludo', label: '🎲 Ludo' },
              { value: 'domino', label: '🎯 Domino' },
            ]} 
            className="w-40" 
          />
          <Select 
            value={filter.slot} 
            onChange={(e) => handleFilterChange('slot', e.target.value)} 
            options={[
              { value: '', label: t('allSlots') || 'All Slots' },
              ...STORE_ITEM_SLOTS.map(slot => ({ value: slot, label: storeItemSlotLabel(slot) }))
            ]} 
            className="w-48" 
          />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 hover:text-red-500">
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div className="space-y-4">
          {itemsIsError ? (
            <QueryErrorNotice error={itemsError} onRetry={() => { void itemsRefetch(); }} />
          ) : itemsLoading && items.length === 0 ? (
            <TableSkeleton rows={8} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Package className="w-10 h-10" />}
              message={search || activeFilters > 0 ? 'No store items match these filters.' : 'No store items yet.'}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  isRTL={isRTL}
                  canManage={canManageStore}
                  onClick={() => setSelectedItem(item)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          ) : (
            <StoreItemTable
              items={items}
              isRTL={isRTL}
              onRowClick={setSelectedItem}
            />
          )}
        </div>
      )}

      {activeTab === 'bundles' && (
        bundlesIsError ? (
          <QueryErrorNotice error={bundlesError} onRetry={() => { void bundlesRefetch(); }} />
        ) : bundlesLoading && bundles.length === 0 ? (
          <TableSkeleton rows={4} />
        ) : bundles.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="w-10 h-10" />}
            message="No bundles yet."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bundles.map((bundle) => (
              <BundleCard key={bundle.id} bundle={bundle} isRTL={isRTL} onView={(b) => setBundleDetailId(b.id)} />
            ))}
          </div>
        )
      )}

      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title?.en || 'Item Details'} size="lg">
        {selectedItem && <ItemDetailContent item={selectedItem} canManage={canManageStore} onEdit={() => { setSelectedItem(null); setEditingItem(selectedItem); }} onDelete={() => setDeleteTarget(selectedItem)} />}
      </Modal>

      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title={t('editItem') || 'Edit Item'} size="lg">
        {editingItem && (
          <CreateItemForm
            initialData={{
              code: editingItem.code,
              type: editingItem.type,
              slot: editingItem.slot,
              scope: editingItem.scope as 'profile' | 'room' | 'game',
              gameType: editingItem.gameType,
              title: editingItem.title as { en: string; ar: string },
              description: editingItem.description as { en: string; ar: string } | undefined,
              priceGameCurrency: editingItem.priceGameCurrency ?? '',
              rarity: editingItem.rarity as 'common' | 'rare' | 'epic' | 'legendary',
              isStackable: editingItem.isStackable,
              defaultExpiryHours: editingItem.defaultExpiryHours ?? undefined,
              isActive: editingItem.isActive,
              assets: (editingItem.assets || []).map(a => ({
                kind: a.kind,
                purpose: a.purpose,
                url: a.url,
                platform: a.platform,
                version: a.version,
              })),
              styleConfig: editingItem.styleConfig,
              displayPriority: editingItem.displayPriority ?? null,
              isLimitedTime: editingItem.isLimitedTime ?? null,
              availabilityStartsAt: editingItem.availabilityStartsAt ?? null,
              availabilityEndsAt: editingItem.availabilityEndsAt ?? null,
            }}
            onSubmit={(data) => updateItemMutation.mutate({ id: editingItem.id, data })}
            isPending={updateItemMutation.isPending}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Modal>

      <Modal isOpen={!!bundleDetailId} onClose={() => setBundleDetailId(null)} title={bundleDetail?.title?.en || 'Bundle details'} size="lg">
        <QueryState
          isLoading={bundleDetailLoading}
          isError={bundleDetailIsError}
          error={bundleDetailError}
          isEmpty={!bundleDetailLoading && !bundleDetailIsError && !bundleDetail}
          emptyMessage="This bundle no longer exists."
          loadingMessage="Loading bundle…"
          onRetry={() => void bundleDetailRefetch()}
        >
          {bundleDetail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-gray-500">{bundleDetail.sku}</p>
                <div className="flex items-center gap-2">
                  {canManageStore && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setEditingBundle({
                          id: bundleDetail.id,
                          titleEn: bundleDetail.title?.en ?? '',
                          titleAr: bundleDetail.title?.ar ?? '',
                          priceGameCurrency: bundleDetail.priceGameCurrency,
                          isActive: bundleDetail.isActive,
                        })
                      }
                    >
                      Edit bundle
                    </Button>
                  )}
                  <Badge variant={bundleDetail.isActive ? 'success' : 'default'}>
                    {bundleDetail.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" />
                <span className="text-2xl font-bold">{formatIntegerString(bundleDetail.priceGameCurrency)}</span>
                <span className="text-xs text-gray-500">GAME_CURRENCY</span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2">
                  Contents ({bundleDetail.items?.length ?? 0})
                </p>
                {bundleDetail.items?.length ? (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {bundleDetail.items.map((line) => (
                      <li key={line.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          {/* `item` is optional on StoreBundleItem — show the
                              name/code only when the backend actually loaded it,
                              otherwise the raw item reference. */}
                          <p className="text-sm font-medium truncate">
                            {line.item?.title?.en || line.item?.code || 'Item'}
                          </p>
                          <p className="text-[11px] font-mono text-gray-400 truncate">
                            {line.item?.code ?? line.itemId}
                          </p>
                        </div>
                        <span className="flex items-center gap-2 shrink-0 text-sm">
                          {line.item?.rarity && (
                            <span className="text-[10px] uppercase text-gray-400">
                              {humanizeToken(line.item.rarity)}
                            </span>
                          )}
                          <span className="font-mono text-gray-600 dark:text-gray-300">×{line.quantity}</span>
                          {canManageStore && (
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`Remove ${line.item?.title?.en ?? line.itemId} from bundle`}
                              disabled={removeBundleItemMutation.isPending}
                              onClick={() =>
                                removeBundleItemMutation.mutate({
                                  bundleId: bundleDetail.id,
                                  itemId: line.itemId,
                                })
                              }
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No items in this bundle yet.</p>
                )}
              </div>

              {canManageStore && (
                <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <div className="min-w-[220px] flex-1">
                    <p className="mb-1 text-xs font-medium text-gray-500">Add item</p>
                    <ItemBadgePicker value={addItemId} onChange={setAddItemId} />
                  </div>
                  <Input
                    label="Qty"
                    type="number"
                    min={1}
                    value={String(addItemQty)}
                    onChange={(e) => setAddItemQty(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <Button
                    size="sm"
                    disabled={!addItemId || addBundleItemMutation.isPending}
                    onClick={() =>
                      addBundleItemMutation.mutate({
                        bundleId: bundleDetail.id,
                        itemId: addItemId,
                      })
                    }
                  >
                    Add item
                  </Button>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </Modal>

      <Modal isOpen={showCreateItem} onClose={() => setShowCreateItem(false)} title={t('createItem') || 'Create Item'} size="lg">
        <CreateItemForm
          onSubmit={(data) => {
            if (!data.assets) return;
            createItemMutation.mutate({ ...data, assets: data.assets });
          }}
          isPending={createItemMutation.isPending}
        />
      </Modal>

      <Modal isOpen={!!editingBundle} onClose={() => setEditingBundle(null)} title="Edit bundle" size="sm">
        {editingBundle && (
          <div className="space-y-4">
            <Input
              label="Title (EN) *"
              value={editingBundle.titleEn}
              onChange={(e) => setEditingBundle({ ...editingBundle, titleEn: e.target.value })}
            />
            <Input
              label="Title (AR)"
              value={editingBundle.titleAr}
              onChange={(e) => setEditingBundle({ ...editingBundle, titleAr: e.target.value })}
            />
            <Input
              label="Price (GAME_CURRENCY) *"
              inputMode="numeric"
              value={editingBundle.priceGameCurrency}
              onChange={(e) =>
                setEditingBundle({
                  ...editingBundle,
                  priceGameCurrency: e.target.value.replace(/[^0-9]/g, ''),
                })
              }
              icon={<Coins className="w-4 h-4 text-emerald-500" />}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editingBundle.isActive}
                onChange={(e) => setEditingBundle({ ...editingBundle, isActive: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingBundle(null)}>Cancel</Button>
              <Button
                disabled={
                  !editingBundle.titleEn ||
                  !/^[1-9][0-9]*$/.test(editingBundle.priceGameCurrency) ||
                  updateBundleMutation.isPending
                }
                onClick={() =>
                  updateBundleMutation.mutate({
                    id: editingBundle.id,
                    data: {
                      title: {
                        en: editingBundle.titleEn,
                        ar: editingBundle.titleAr || editingBundle.titleEn,
                      },
                      priceGameCurrency: editingBundle.priceGameCurrency,
                      isActive: editingBundle.isActive,
                    },
                  })
                }
              >
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreateBundle} onClose={() => setShowCreateBundle(false)} title={t('createBundle') || 'Create Bundle'}>
        <CreateBundleForm onSubmit={createBundleMutation.mutate} isPending={createBundleMutation.isPending} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) { setDeleteTarget(null); deleteItemMutation.reset(); } }}
        title="Delete store item"
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) deleteItemMutation.mutate(deleteTarget.id);
        }}
      >
        {/* Show the real item's media so the operator confirms the correct row,
            not just an identifier they cannot picture. */}
        {deleteTarget && (
          <div className="mb-3 flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <MediaPreview
                url={storeItemImageUrl(deleteTarget.assets)}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900 dark:text-white">
                {deleteTarget.title?.en || deleteTarget.code}
              </p>
              <p className="truncate font-mono text-xs text-gray-500">{deleteTarget.code}</p>
            </div>
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">
            {deleteTarget?.code}
          </span>{' '}
          — this permanently removes the item from the store. Items that were
          already purchased are deactivated rather than deleted, so purchase
          history is preserved.
        </p>
        {deleteItemMutation.error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {(deleteItemMutation.error as { message?: string }).message ||
              'The item could not be deleted.'}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
