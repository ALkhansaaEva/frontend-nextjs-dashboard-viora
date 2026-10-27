'use client';

import { useState } from 'react';
import { Loader2, Coins, Plus, X } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import { ItemBadgePicker } from '@/shared/components/rewards/ItemBadgePicker';
import type { CreateStoreBundleRequest } from '@/dto/store';

interface CreateBundleFormProps {
  onSubmit: (data: CreateStoreBundleRequest) => void;
  isPending: boolean;
}

const emptyItem = { itemId: '', quantity: 1 };

export function CreateBundleForm({ onSubmit, isPending }: CreateBundleFormProps) {
  const [newBundle, setNewBundle] = useState({
    sku: '',
    titleEn: '',
    titleAr: '',
    priceGameCurrency: '',
    isActive: true,
  });
  const [items, setItems] = useState<typeof emptyItem[]>([emptyItem]);

  const handleSubmit = () => {
    onSubmit({
      sku: newBundle.sku,
      title: { en: newBundle.titleEn, ar: newBundle.titleAr || newBundle.titleEn },
      priceGameCurrency: newBundle.priceGameCurrency,
      isActive: newBundle.isActive,
      // An unpicked row is a draft placeholder, not a bundle line.
      items: items
        .filter((entry) => entry.itemId)
        .map(({ itemId, quantity }) => ({ itemId, quantity })),
    });
  };

  const isValid =
    newBundle.sku &&
    newBundle.titleEn &&
    /^[1-9][0-9]*$/.test(newBundle.priceGameCurrency) &&
    items.every((entry) => !entry.itemId || (Number.isInteger(entry.quantity) && entry.quantity > 0)) &&
    !isPending;

  return (
    <div className="space-y-4">
      <Input
        label="SKU *"
        value={newBundle.sku}
        onChange={(e) => setNewBundle({ ...newBundle, sku: e.target.value })}
        placeholder="legendary_dice_pack"
      />
      <Input
        label="Title (EN) *"
        value={newBundle.titleEn}
        onChange={(e) => setNewBundle({ ...newBundle, titleEn: e.target.value })}
        placeholder="Bundle Name"
      />
      <Input
        label="Title (AR)"
        value={newBundle.titleAr}
        onChange={(e) => setNewBundle({ ...newBundle, titleAr: e.target.value })}
        placeholder="اسم الحزمة"
      />
      <Input
        label="Price (GAME_CURRENCY) *"
        inputMode="numeric"
        value={newBundle.priceGameCurrency}
        onChange={(e) => setNewBundle({ ...newBundle, priceGameCurrency: e.target.value.replace(/[^0-9]/g, '') })}
        icon={<Coins className="w-4 h-4 text-emerald-500" />}
      />
      {/* ponytail: POST /store/bundles hardcodes isActive:true server-side, so
          this toggle is inert on create — drop it if the form ever grows an
          edit mode (that path is PATCH /store/admin/bundles/:id). */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <input
          type="checkbox"
          id="bundleIsActive"
          checked={newBundle.isActive}
          onChange={(e) => setNewBundle({ ...newBundle, isActive: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
        />
        <label htmlFor="bundleIsActive" className="text-sm font-medium">Active (visible in store)</label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</p>
        {items.map((entry, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <ItemBadgePicker
                value={entry.itemId}
                onChange={(itemId) => setItems((rows) => rows.map((row, i) => (i === index ? { ...row, itemId } : row)))}
              />
            </div>
            <Input
              label="Qty"
              type="number"
              min={1}
              value={entry.quantity}
              onChange={(e) => setItems((rows) => rows.map((row, i) => (i === index ? { ...row, quantity: parseInt(e.target.value) || 0 } : row)))}
              className="w-20"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}
                className="mt-2 p-2 text-gray-400 hover:text-red-500"
                aria-label="Remove item"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setItems((rows) => [...rows, emptyItem])}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Add item
        </Button>
      </div>

      <Button
        className="w-full bg-violet-600 hover:bg-violet-700"
        onClick={handleSubmit}
        disabled={!isValid}
      >
        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isPending ? 'Creating...' : 'Create Bundle'}
      </Button>
    </div>
  );
}
