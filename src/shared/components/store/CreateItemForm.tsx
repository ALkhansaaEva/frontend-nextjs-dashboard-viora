'use client';

import { useState } from 'react';
import { Loader2, Package, Coins, Image, Palette, CalendarClock, type LucideIcon } from 'lucide-react';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { AssetForm, StoreAssetData, defaultAssetData } from './AssetForm';
import { ITEM_TYPES, RARITIES, SCOPES, GAME_TYPES } from '@/dto/store';
import { cn } from '@/shared/lib/utils';
import { storeItemTypeLabel } from '@/shared/lib/store-item-types';


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
  priceGameCurrency: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isStackable: boolean;
defaultExpiryHours: number;
  isActive: boolean;
  /** Edit-only (UpdateItemDto) — see the comment on UpdateStoreItemSchema. */
  displayPriority: number;
  isLimitedTime: boolean;
  availabilityStartsAt: string;
  availabilityEndsAt: string;
};

/**
 * `datetime-local` inputs speak `YYYY-MM-DDTHH:mm` in the operator's own
 * timezone; the API speaks full ISO 8601 UTC (`@IsDateString()`). These two
 * helpers are the only place that conversion lives, so the round trip
 * edit → save → reload shows the same wall-clock time again.
 */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Empty input means "clear the column" → `null`, which the DTO passes through. */
function toIsoOrNull(local: string): string | null {
  if (!local) return null;
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const defaultItem: NewStoreItemData = {
  code: '',
  type: 'profile_avatar',
  slot: 'profile_avatar',
  scope: 'profile',
  gameType: '',
  titleEn: '',
  titleAr: '',
  descriptionEn: '',
  descriptionAr: '',
  priceGameCurrency: '',
  rarity: 'common',
  isStackable: false,
  defaultExpiryHours: 0,
  isActive: true,
  displayPriority: 0,
  isLimitedTime: false,
  availabilityStartsAt: '',
  availabilityEndsAt: '',
};

export interface StoreItemFormSubmission {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    title: { en: string; ar: string };
    description?: { en: string; ar: string };
    priceGameCurrency: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
isStackable?: boolean;
  defaultExpiryHours?: number;
  isActive: boolean;
  assets?: StoreAssetData[];
  styleConfig?: Record<string, unknown>;
  /** Edit-only; only present when the operator changed the value. */
  displayPriority?: number;
  isLimitedTime?: boolean;
  availabilityStartsAt?: string | null;
  availabilityEndsAt?: string | null;
}

interface CreateItemFormProps {
  onSubmit: (data: StoreItemFormSubmission) => void;
  isPending: boolean;
  initialData?: {
    code: string;
    type: string;
    slot: string;
    scope: 'profile' | 'room' | 'game';
    gameType?: string;
    title: { en: string; ar: string };
    description?: { en: string; ar: string };
    priceGameCurrency: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    isStackable?: boolean;
    defaultExpiryHours?: number;
    isActive: boolean;
    assets: StoreAssetData[];
    styleConfig?: Record<string, unknown>;
    /** Edit-only (UpdateItemDto) — absent on CreateItemDto. */
    displayPriority?: number | null;
    isLimitedTime?: boolean | null;
    availabilityStartsAt?: string | null;
    availabilityEndsAt?: string | null;
  };
  onCancel?: () => void;
}

function SectionCard({ icon: Icon, title, children, className }: { icon: LucideIcon; title: string; children: React.ReactNode; className?: string }) {
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
      priceGameCurrency: initialData.priceGameCurrency || '',
      rarity: initialData.rarity,
      isStackable: initialData.isStackable || false,
      defaultExpiryHours: initialData.defaultExpiryHours || 0,
      isActive: initialData.isActive,
      displayPriority: initialData.displayPriority ?? 0,
      isLimitedTime: initialData.isLimitedTime ?? false,
      availabilityStartsAt: toLocalInputValue(initialData.availabilityStartsAt),
      availabilityEndsAt: toLocalInputValue(initialData.availabilityEndsAt),
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

  // Snapshots of everything this form can persist, taken once at mount. Save is
  // "dirty" only against these, so reopening the form starts clean, a failed
  // save leaves the operator's edits (and the enabled button) in place, and
  // there is no flag that can go stale relative to what was actually stored.
  // `useState` (not `useRef`) because the baseline is read while rendering.
  const [baseline] = useState(getInitialItem);
  const [baselineAssetsJson] = useState(() => JSON.stringify(getInitialAssets()));
  const [baselineStyleConfigJson] = useState(() => JSON.stringify(getInitialStyleConfig()));

  const [newItem, setNewItem] = useState<NewStoreItemData>(baseline);
  const [newAssets, setNewAssets] = useState<StoreAssetData[]>(getInitialAssets);
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

    const payload: StoreItemFormSubmission = {
      code: newItem.code,
      type: newItem.type,
      slot: newItem.slot,
      scope: newItem.scope,
      gameType: newItem.gameType || undefined,
      title: { en: newItem.titleEn, ar: newItem.titleAr || newItem.titleEn },
      description: (newItem.descriptionEn || newItem.descriptionAr)
        ? { en: newItem.descriptionEn, ar: newItem.descriptionAr || newItem.descriptionEn }
        : undefined,
      priceGameCurrency: newItem.priceGameCurrency,
      rarity: newItem.rarity,
      // NOT `|| undefined`: that drops a legitimate falsy value, so turning
      // stackability OFF or clearing the expiry to 0 never reached the API and
      // the saved item silently kept its old value. `undefined` alone means
      // "leave untouched"; false/0 are real values the backend accepts.
      isStackable: newItem.isStackable,
      defaultExpiryHours: newItem.defaultExpiryHours,
      isActive: newItem.isActive,
      styleConfig: Object.keys(styleConfigObj).length > 0 ? styleConfigObj : undefined
    };

    // Only send assets if modified (avoids backend deleting+recreating unchanged ones)
    if (JSON.stringify(finalAssets) !== baselineAssetsJson) {
      payload.assets = finalAssets;
    }

    // The four availability/ordering keys exist only on UpdateItemDto, so they
    // are edit-only — and each is sent only when the operator actually moved
    // it, so a price rename can never overwrite availability that changed
    // elsewhere. `null` clears the nullable date columns; omitting a key would
    // leave the stored value in place.
    if (isEditing) {
      const base = baseline;
      if (newItem.displayPriority !== base.displayPriority) {
        payload.displayPriority = newItem.displayPriority;
      }
      if (newItem.isLimitedTime !== base.isLimitedTime) {
        payload.isLimitedTime = newItem.isLimitedTime;
      }
      if (newItem.availabilityStartsAt !== base.availabilityStartsAt) {
        payload.availabilityStartsAt = toIsoOrNull(newItem.availabilityStartsAt);
      }
      if (newItem.availabilityEndsAt !== base.availabilityEndsAt) {
        payload.availabilityEndsAt = toIsoOrNull(newItem.availabilityEndsAt);
      }
    }

    onSubmit(payload);
  };

  // Four small JSON compares — cheap enough to run every render, and avoiding a
  // memo here keeps this a single source of truth for "does the stored contract
  // differ from the form".
  const isDirty =
    JSON.stringify(newItem) !== JSON.stringify(baseline)
    || JSON.stringify(newAssets) !== baselineAssetsJson
    || JSON.stringify(newStyleConfig) !== baselineStyleConfigJson
    || !!pendingAsset.url;

  const hasPendingAsset = !!pendingAsset.url;
  const hasAnyAsset = newAssets.length > 0 || hasPendingAsset;
  const hasValidPrice = /^(0|[1-9][0-9]*)$/.test(newItem.priceGameCurrency);
const isValid =
    newItem.code &&
    newItem.titleEn &&
    hasValidPrice &&
    !isPending &&
    isDirty &&
    (isEditing || hasAnyAsset);

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
            options={ITEM_TYPES.map(t => ({ value: t, label: storeItemTypeLabel(t) }))} />
          {/* Backend has no `slot` enum (free-text @IsString() on CreateItemDto,
              no documented value set) — a free-text input, not a copy of Type's options. */}
          <Input label="Slot * (free text — no backend enum)" value={newItem.slot}
            onChange={(e) => setNewItem({ ...newItem, slot: e.target.value })}
            placeholder="e.g. dice, cover, avatar_frame" />
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

      <SectionCard icon={Coins} title="Pricing & Availability">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Price (GAME_CURRENCY)" inputMode="numeric" value={newItem.priceGameCurrency}
            onChange={(e) => setNewItem({ ...newItem, priceGameCurrency: e.target.value.replace(/[^0-9]/g, '') })}
            icon={<Coins className="w-4 h-4 text-emerald-500" />} />
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

      {/* Edit-only, mirroring the backend split: these four are declared on
          UpdateItemDto and NOT on CreateItemDto, so on create they would be
          silently stripped by the whitelist pipe. */}
      {isEditing && (
        <SectionCard icon={CalendarClock} title="Availability & Ordering (edit only)">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Display Priority" type="number" value={newItem.displayPriority}
              onChange={(e) => setNewItem({ ...newItem, displayPriority: parseInt(e.target.value) || 0 })}
              placeholder="0" />
            <label className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg cursor-pointer self-end">
              <input type="checkbox" checked={newItem.isLimitedTime}
                onChange={(e) => setNewItem({ ...newItem, isLimitedTime: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-sm font-medium">Time limited</span>
            </label>
            <Input label="Available From" type="datetime-local" value={newItem.availabilityStartsAt}
              onChange={(e) => setNewItem({ ...newItem, availabilityStartsAt: e.target.value })} />
            <Input label="Available Until" type="datetime-local" value={newItem.availabilityEndsAt}
              onChange={(e) => setNewItem({ ...newItem, availabilityEndsAt: e.target.value })} />
            <p className="text-xs text-gray-500 sm:col-span-2">
              Leave a date empty to clear it. Times are your browser&apos;s local time and are
              stored as UTC.
            </p>
          </div>
        </SectionCard>
      )}

      {/* styleConfig is create-only: backend UpdateItemDto has no such field,
          so the section is hidden on edit rather than collecting input the
          PATCH would reject. */}
      {!isEditing && (
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
      )}

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
            : !isDirty
              ? 'No changes to save'
              : !hasAnyAsset && !isEditing
                ? 'Add at least one asset'
                : (isEditing ? 'Update Item' : 'Create Item')}
        </Button>
      </div>
    </div>
  );
}
