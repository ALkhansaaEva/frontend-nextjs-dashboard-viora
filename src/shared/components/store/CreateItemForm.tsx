'use client';

import { useState, useRef } from 'react';
import { Loader2, Package, Coins, Gem, Image, Palette } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { AssetForm, StoreAssetData, defaultAssetData } from './AssetForm';
import { ITEM_TYPES, RARITIES, SCOPES, GAME_TYPES } from '@/dto/store';
import { cn } from '@/shared/lib/utils';

const typeLabels: Record<string, string> = {
  ludo_cover: 'Ludo Cover', dice: 'Dice', chess_piece: 'Chess Piece', room_theme: 'Room Theme',
  room_wallpaper: 'Room Wallpaper', room_mic_skin: 'Mic Skin', domino_board: 'Domino Board',
  domino_tile_face: 'Tile Face', domino_tile_back: 'Tile Back', avatar_frame: 'Avatar Frame',
  profile_background: 'Profile BG', profile_frame: 'Profile Frame', profile_avatar: 'Profile Avatar',
  ludo_board: 'Ludo Board', ludo_dice: 'Ludo Dice', ludo_tokens: 'Ludo Tokens', badge: 'Badge', avatar: 'Avatar'
};

export type NewStoreItemData = {
  code: string;
  type: string;
  slot: string;
  scope: 'profile' | 'room' | 'game';
  gameType: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  priceGems: number;
  priceCoins: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isStackable: boolean;
  defaultExpiryHours: number;
  isActive: boolean;
};

const defaultItem: NewStoreItemData = {
  code: '',
  type: 'avatar',
  slot: 'avatar',
  scope: 'profile',
  gameType: '',
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  priceGems: 0,
  priceCoins: 0,
  rarity: 'common',
  isStackable: false,
  defaultExpiryHours: 0,
  isActive: true,
};

interface CreateItemFormProps {
  onSubmit: (data: {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    title: { en: string; ar: string };
    description?: { en: string; ar: string };
    priceGems?: number;
    priceCoins?: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isStackable?: boolean;
    defaultExpiryHours?: number;
    isActive: boolean;
    assets: StoreAssetData[];
    styleConfig?: Record<string, unknown>;
  }) => void;
  isPending: boolean;
  initialData?: {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    title: { en: string; ar: string };
    description?: { en: string; ar: string };
    priceGems?: number;
    priceCoins?: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isStackable?: boolean;
    defaultExpiryHours?: number;
    isActive: boolean;
    assets: StoreAssetData[];
    styleConfig?: Record<string, unknown>;
  };
  onCancel?: () => void;
}

function SectionCard({ icon: Icon, title, children, className }: { icon: any; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Icon className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export function CreateItemForm({ onSubmit, isPending, initialData, onCancel }: CreateItemFormProps) {
  const isEditing = !!initialData;
  
  // Convert initialData to NewStoreItemData format
  const getInitialItem = (): NewStoreItemData => {
    if (!initialData) return defaultItem;
    return {
      code: initialData.code,
      type: initialData.type,
      slot: initialData.slot,
      scope: initialData.scope,
      gameType: initialData.gameType || '',
      titleEn: initialData.title.en,
      titleAr: initialData.title.ar,
      descriptionEn: initialData.description?.en || '',
      descriptionAr: initialData.description?.ar || '',
      priceGems: initialData.priceGems || 0,
      priceCoins: initialData.priceCoins || 0,
      rarity: initialData.rarity,
      isStackable: initialData.isStackable || false,
      defaultExpiryHours: initialData.defaultExpiryHours || 0,
      isActive: initialData.isActive,
    };
  };

  const getInitialAssets = (): StoreAssetData[] => {
    if (!initialData?.assets) return [];
    return initialData.assets.map(asset => ({
      kind: asset.kind,
      purpose: asset.purpose,
      url: asset.url,
      platform: asset.platform,
      version: asset.version,
    }));
  };

  const getInitialStyleConfig = (): Record<string, string> => {
    if (!initialData?.styleConfig) return {};
    const sc = initialData.styleConfig;
    return {
      primaryColor: (sc.primaryColor as string) || '',
      secondaryColor: (sc.secondaryColor as string) || '',
      borderRadius: String(sc.borderRadius || ''),
      glowEffect: sc.hasGlow === true ? 'true' : sc.hasGlow === false ? 'false' : (sc.glowEffect as string) || 'false',
    };
  };

  const [newItem, setNewItem] = useState<NewStoreItemData>(getInitialItem);
  const [newAssets, setNewAssets] = useState<StoreAssetData[]>(getInitialAssets);
  const initialAssetsJson = useRef(JSON.stringify(getInitialAssets()));
  const [newStyleConfig, setNewStyleConfig] = useState<Record<string, string>>(getInitialStyleConfig);
  const [pendingAsset, setPendingAsset] = useState<StoreAssetData>(defaultAssetData);

  const handleSubmit = () => {
    const finalAssets = pendingAsset.url
      ? [...newAssets, pendingAsset]
      : newAssets;

    const styleConfigObj: Record<string, unknown> = {};
    if (newStyleConfig.primaryColor) styleConfigObj.primaryColor = newStyleConfig.primaryColor;
    if (newStyleConfig.secondaryColor) styleConfigObj.secondaryColor = newStyleConfig.secondaryColor;
    if (newStyleConfig.borderRadius) styleConfigObj.borderRadius = parseInt(newStyleConfig.borderRadius) || 8;
    if (newStyleConfig.glowEffect) styleConfigObj.hasGlow = newStyleConfig.glowEffect === 'true';

    const payload: any = {
      code: newItem.code,
      type: newItem.type,
      slot: newItem.slot,
      scope: newItem.scope,
      gameType: newItem.gameType || undefined,
      title: { en: newItem.titleEn, ar: newItem.titleAr || newItem.titleEn },
      description: (newItem.descriptionEn || newItem.descriptionAr)
        ? { en: newItem.descriptionEn, ar: newItem.descriptionAr || newItem.descriptionEn }
        : undefined,
      priceGems: newItem.priceGems || undefined,
      priceCoins: newItem.priceCoins || undefined,
      rarity: newItem.rarity,
      isStackable: newItem.isStackable || undefined,
      defaultExpiryHours: newItem.defaultExpiryHours || undefined,
      isActive: newItem.isActive,
      styleConfig: Object.keys(styleConfigObj).length > 0 ? styleConfigObj : undefined
    };

    // Only send assets if modified (avoids backend deleting+recreating unchanged ones)
    if (JSON.stringify(finalAssets) !== initialAssetsJson.current) {
      payload.assets = finalAssets;
    }

    onSubmit(payload);
  };

  const isValid = newItem.code && newItem.titleEn && !isPending;
  const hasPendingAsset = !!pendingAsset.url;
  const hasAnyAsset = newAssets.length > 0 || hasPendingAsset;

  return (
    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
      <SectionCard icon={Package} title="Basic Information">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Code *" value={newItem.code}
            onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
            placeholder="item_code_01"
            disabled={isEditing}
            className={isEditing ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Title (EN) *" value={newItem.titleEn}
              onChange={(e) => setNewItem({ ...newItem, titleEn: e.target.value })}
              placeholder="Item Name" />
            <Input label="Title (AR)" value={newItem.titleAr}
              onChange={(e) => setNewItem({ ...newItem, titleAr: e.target.value })}
              placeholder="اسم العنصر" />
          </div>
          <Input label="Description (EN)" value={newItem.descriptionEn}
            onChange={(e) => setNewItem({ ...newItem, descriptionEn: e.target.value })}
            placeholder="Item description in English" />
          <Input label="Description (AR)" value={newItem.descriptionAr}
            onChange={(e) => setNewItem({ ...newItem, descriptionAr: e.target.value })}
            placeholder="وصف العنصر بالعربي" />
          <Select label="Type *" value={newItem.type}
            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
            options={ITEM_TYPES.map(t => ({ value: t, label: typeLabels[t] || t }))} />
          <Select label="Slot *" value={newItem.slot}
            onChange={(e) => setNewItem({ ...newItem, slot: e.target.value })}
            options={ITEM_TYPES.map(t => ({ value: t, label: typeLabels[t] || t }))} />
          <Select label="Scope *" value={newItem.scope}
            onChange={(e) => setNewItem({ ...newItem, scope: e.target.value as NewStoreItemData['scope'] })}
            options={SCOPES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          <Select label="Game Type" value={newItem.gameType}
            onChange={(e) => setNewItem({ ...newItem, gameType: e.target.value })}
            options={[{ value: '', label: 'None' }, ...GAME_TYPES.map(g => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))]} />
          <Select label="Rarity *" value={newItem.rarity}
            onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value as NewStoreItemData['rarity'] })}
            options={RARITIES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))} />
        </div>
      </SectionCard>

      <SectionCard icon={Gem} title="Pricing & Availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Price (Gems)" type="number" value={newItem.priceGems}
            onChange={(e) => setNewItem({ ...newItem, priceGems: parseInt(e.target.value) || 0 })}
            icon={<Gem className="w-4 h-4 text-purple-500" />} />
          <Input label="Price (Coins)" type="number" value={newItem.priceCoins}
            onChange={(e) => setNewItem({ ...newItem, priceCoins: parseInt(e.target.value) || 0 })}
            icon={<Coins className="w-4 h-4 text-yellow-500" />} />
          <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newItem.isStackable}
                onChange={(e) => setNewItem({ ...newItem, isStackable: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-sm font-medium">Stackable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newItem.isActive}
                onChange={(e) => setNewItem({ ...newItem, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-sm font-medium">Active in store</span>
            </label>
          </div>
          <Input label="Default Expiry (hours)" type="number" value={newItem.defaultExpiryHours}
            onChange={(e) => setNewItem({ ...newItem, defaultExpiryHours: parseInt(e.target.value) || 0 })}
            placeholder="0 = permanent" />
        </div>
      </SectionCard>

      <SectionCard icon={Image} title="Assets">
        <AssetForm assets={newAssets} onChange={setNewAssets} pendingAsset={pendingAsset} onPendingChange={setPendingAsset} />
      </SectionCard>

      <SectionCard icon={Palette} title="Style Configuration">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="Primary Color" value={newStyleConfig.primaryColor || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, primaryColor: e.target.value })}
            placeholder="#FFD700" />
          <Input label="Secondary Color" value={newStyleConfig.secondaryColor || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, secondaryColor: e.target.value })}
            placeholder="#FFA500" />
          <Input label="Border Radius" value={newStyleConfig.borderRadius || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, borderRadius: e.target.value })}
            placeholder="8" />
          <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer self-end">
            <input type="checkbox" checked={newStyleConfig.glowEffect === 'true'}
              onChange={(e) => setNewStyleConfig({ ...newStyleConfig, glowEffect: e.target.checked ? 'true' : 'false' })}
              className="w-4 h-4 rounded border-gray-300 text-violet-600" />
            <span className="text-sm font-medium">Glow Effect</span>
          </label>
        </div>
      </SectionCard>

      <div className="flex gap-3">
        {isEditing && onCancel && (
          <Button variant="outline" className="flex-1 h-11 text-base" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button className={`${isEditing && onCancel ? 'flex-1' : 'w-full'} bg-violet-600 hover:bg-violet-700 h-11 text-base`} onClick={handleSubmit} disabled={!isValid}>
          {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isPending
            ? (isEditing ? 'Updating...' : 'Creating...')
            : hasAnyAsset
              ? (isEditing ? 'Update Item' : 'Create Item')
              : 'Add at least one asset'}
        </Button>
      </div>
    </div>
  );
}
