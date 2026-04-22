'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { AssetForm, StoreAssetData } from './AssetForm';
import { ITEM_TYPES, RARITIES, SCOPES, GAME_TYPES } from '@/dto/store';

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
}

export function CreateItemForm({ onSubmit, isPending }: CreateItemFormProps) {
  const [newItem, setNewItem] = useState<NewStoreItemData>(defaultItem);
  const [newAssets, setNewAssets] = useState<StoreAssetData[]>([]);
  const [newStyleConfig, setNewStyleConfig] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const styleConfigObj: Record<string, unknown> = {};
    if (newStyleConfig.primaryColor) styleConfigObj.primaryColor = newStyleConfig.primaryColor;
    if (newStyleConfig.secondaryColor) styleConfigObj.secondaryColor = newStyleConfig.secondaryColor;
    if (newStyleConfig.borderRadius) styleConfigObj.borderRadius = parseInt(newStyleConfig.borderRadius) || 8;
    if (newStyleConfig.glowEffect) styleConfigObj.hasGlow = newStyleConfig.glowEffect === 'true';

    onSubmit({
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
      assets: newAssets,
      styleConfig: Object.keys(styleConfigObj).length > 0 ? styleConfigObj : undefined
    });
  };

  const isValid = newItem.code && newItem.titleEn && newAssets.length > 0 && !isPending;

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
      <Input
        label="Code *"
        value={newItem.code}
        onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
        placeholder="item_code_01"
      />
      <Input
        label="Title (EN) *"
        value={newItem.titleEn}
        onChange={(e) => setNewItem({ ...newItem, titleEn: e.target.value })}
        placeholder="Item Name"
      />
      <Input
        label="Title (AR)"
        value={newItem.titleAr}
        onChange={(e) => setNewItem({ ...newItem, titleAr: e.target.value })}
        placeholder="اسم العنصر"
      />
      <Input
        label="Description (EN)"
        value={newItem.descriptionEn}
        onChange={(e) => setNewItem({ ...newItem, descriptionEn: e.target.value })}
        placeholder="Item description in English"
      />
      <Input
        label="Description (AR)"
        value={newItem.descriptionAr}
        onChange={(e) => setNewItem({ ...newItem, descriptionAr: e.target.value })}
        placeholder="وصف العنصر بالعربي"
      />
      <Select
        label="Type *"
        value={newItem.type}
        onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
        options={ITEM_TYPES.map(t => ({ value: t, label: typeLabels[t] || t }))}
      />
      <Select
        label="Slot *"
        value={newItem.slot}
        onChange={(e) => setNewItem({ ...newItem, slot: e.target.value })}
        options={ITEM_TYPES.map(t => ({ value: t, label: typeLabels[t] || t }))}
      />
      <Select
        label="Scope *"
        value={newItem.scope}
        onChange={(e) => setNewItem({ ...newItem, scope: e.target.value as NewStoreItemData['scope'] })}
        options={SCOPES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
      />
      <Select
        label="Game Type"
        value={newItem.gameType}
        onChange={(e) => setNewItem({ ...newItem, gameType: e.target.value })}
        options={[{ value: '', label: 'None' }, ...GAME_TYPES.map(g => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))]}
      />
      <Select
        label="Rarity *"
        value={newItem.rarity}
        onChange={(e) => setNewItem({ ...newItem, rarity: e.target.value as NewStoreItemData['rarity'] })}
        options={RARITIES.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))}
      />
      <Input
        label="Price (Gems)"
        type="number"
        value={newItem.priceGems}
        onChange={(e) => setNewItem({ ...newItem, priceGems: parseInt(e.target.value) || 0 })}
      />
      <Input
        label="Price (Coins)"
        type="number"
        value={newItem.priceCoins}
        onChange={(e) => setNewItem({ ...newItem, priceCoins: parseInt(e.target.value) || 0 })}
      />
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="isStackable"
          checked={newItem.isStackable}
          onChange={(e) => setNewItem({ ...newItem, isStackable: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <label htmlFor="isStackable" className="text-sm font-medium">Stackable Item</label>
      </div>
      <Input
        label="Default Expiry (hours)"
        type="number"
        value={newItem.defaultExpiryHours}
        onChange={(e) => setNewItem({ ...newItem, defaultExpiryHours: parseInt(e.target.value) || 0 })}
        placeholder="0 = permanent"
      />
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="isActive"
          checked={newItem.isActive}
          onChange={(e) => setNewItem({ ...newItem, isActive: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <label htmlFor="isActive" className="text-sm font-medium">Active (visible in store)</label>
      </div>

      <AssetForm assets={newAssets} onChange={setNewAssets} />

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Style Config</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <Input
            label="Primary Color"
            value={newStyleConfig.primaryColor || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, primaryColor: e.target.value })}
            placeholder="#FFD700"
          />
          <Input
            label="Secondary Color"
            value={newStyleConfig.secondaryColor || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, secondaryColor: e.target.value })}
            placeholder="#FFA500"
          />
          <Input
            label="Border Radius"
            value={newStyleConfig.borderRadius || ''}
            onChange={(e) => setNewStyleConfig({ ...newStyleConfig, borderRadius: e.target.value })}
            placeholder="8"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="glowEffect"
              checked={newStyleConfig.glowEffect === 'true'}
              onChange={(e) => setNewStyleConfig({ ...newStyleConfig, glowEffect: e.target.checked ? 'true' : 'false' })}
              className="w-4 h-4 rounded border-gray-300 text-violet-600"
            />
            <label htmlFor="glowEffect" className="text-sm">Glow Effect</label>
          </div>
        </div>
      </div>

      <Button
        className="sm:col-span-2 mt-2 bg-violet-600 hover:bg-violet-700"
        onClick={handleSubmit}
        disabled={!isValid}
      >
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isPending ? 'Creating...' : newAssets.length === 0 ? 'Add at least one asset' : 'Create Item'}
      </Button>
    </div>
  );
}