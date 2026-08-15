'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, Package, Plus, LayoutGrid, List, Filter, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';

import { Select } from '@/shared/components/ui/Select';
import { storeService } from '@/services';
import { useHasPermission } from '@/hooks';
import { TableSkeleton } from '@/components/skeletons';
import { useLanguage } from '@/components/language-context';
import type { StoreItem } from '@/services/store.service';
import type { CreateStoreItemRequest, CreateStoreBundleRequest } from '@/dto/store';
import { ITEM_TYPES } from '@/dto/store';
import { CreateItemForm, CreateBundleForm, StoreItemCard, StoreItemTable, BundleCard, ItemDetailContent } from '@/shared/components/store';

const typeLabels: Record<string, string> = {
  ludo_cover: 'Ludo Cover', dice: 'Dice', chess_piece: 'Chess Piece', room_theme: 'Room Theme',
  room_wallpaper: 'Room Wallpaper', room_mic_skin: 'Mic Skin', domino_board: 'Domino Board',
  domino_tile_face: 'Tile Face', domino_tile_back: 'Tile Back', avatar_frame: 'Avatar Frame',
  profile_background: 'Profile BG', profile_frame: 'Profile Frame', profile_avatar: 'Profile Avatar',
  ludo_board: 'Ludo Board', ludo_dice: 'Ludo Dice', ludo_tokens: 'Ludo Tokens', badge: 'Badge', avatar: 'Avatar'
};

export default function StorePage() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canManageStore = hasPermission('manage_store') || hasPermission('view_transactions');
  
  const [activeTab, setActiveTab] = useState<'items' | 'bundles'>('items');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState({ scope: '', gameType: '', slot: '' });
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showCreateBundle, setShowCreateBundle] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['store', 'items', filter],
    queryFn: () => storeService.getItems(filter),
    staleTime: 30000,
  });

  const { data: bundles = [], isLoading: bundlesLoading } = useQuery({
    queryKey: ['store', 'bundles'],
    queryFn: () => storeService.getBundles(),
    staleTime: 30000,
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

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => storeService.deleteItem(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['store', 'items'] });
      const previousItems = queryClient.getQueryData(['store', 'items', filter]);
      queryClient.setQueryData(['store', 'items', filter], (old: StoreItem[] | undefined) => 
        old?.filter(item => item.id !== id) || []
      );
      setSelectedItem(null);
      return { previousItems };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['store', 'items', filter], context?.previousItems);
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
    setFilter({ scope: '', gameType: '', slot: '' });
    setActiveFilters(0);
  };

  const isLoading = itemsLoading || bundlesLoading;
  if (isLoading && items.length === 0) return <TableSkeleton rows={8} />;

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
              ...ITEM_TYPES.map(type => ({ value: type, label: typeLabels[type] || type }))
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
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item) => (
                <StoreItemCard
                  key={item.id}
                  item={item}
                  isRTL={isRTL}
                  canManage={canManageStore}
                  onClick={() => setSelectedItem(item)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => deleteItemMutation.mutate(item.id)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bundles.map((bundle) => (
            <BundleCard key={bundle.id} bundle={bundle} isRTL={isRTL} />
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.title?.en || 'Item Details'} size="lg">
        {selectedItem && <ItemDetailContent item={selectedItem} canManage={canManageStore} onEdit={() => { setSelectedItem(null); setEditingItem(selectedItem); }} onDelete={() => deleteItemMutation.mutate(selectedItem.id)} />}
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
              priceGems: editingItem.priceGems,
              priceCoins: editingItem.priceCoins,
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
            }}
            onSubmit={(data) => updateItemMutation.mutate({ id: editingItem.id, data })}
            isPending={updateItemMutation.isPending}
            onCancel={() => setEditingItem(null)}
          />
        )}
      </Modal>

      <Modal isOpen={showCreateItem} onClose={() => setShowCreateItem(false)} title={t('createItem') || 'Create Item'} size="lg">
        <CreateItemForm onSubmit={createItemMutation.mutate} isPending={createItemMutation.isPending} />
      </Modal>

      <Modal isOpen={showCreateBundle} onClose={() => setShowCreateBundle(false)} title={t('createBundle') || 'Create Bundle'}>
        <CreateBundleForm onSubmit={createBundleMutation.mutate} isPending={createBundleMutation.isPending} />
      </Modal>
    </div>
  );
}