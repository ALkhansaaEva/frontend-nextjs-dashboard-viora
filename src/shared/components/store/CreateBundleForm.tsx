'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';

interface CreateBundleFormProps {
  onSubmit: (data: {
    sku: string;
    title: { en: string; ar: string };
    priceGems?: number;
    priceCoins?: number;
    isActive: boolean;
  }) => void;
  isPending: boolean;
}

export function CreateBundleForm({ onSubmit, isPending }: CreateBundleFormProps) {
  const [newBundle, setNewBundle] = useState({
    sku: '',
    titleEn: '',
    titleAr: '',
    priceGems: 0,
    priceCoins: 0,
    isActive: true,
  });

  const handleSubmit = () => {
    onSubmit({
      sku: newBundle.sku,
      title: { en: newBundle.titleEn, ar: newBundle.titleAr || newBundle.titleEn },
      priceGems: newBundle.priceGems || undefined,
      priceCoins: newBundle.priceCoins || undefined,
      isActive: newBundle.isActive,
    });
  };

  const isValid = newBundle.sku && newBundle.titleEn && !isPending;

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
        label="Price (Gems)"
        type="number"
        value={newBundle.priceGems}
        onChange={(e) => setNewBundle({ ...newBundle, priceGems: parseInt(e.target.value) || 0 })}
      />
      <Input
        label="Price (Coins)"
        type="number"
        value={newBundle.priceCoins}
        onChange={(e) => setNewBundle({ ...newBundle, priceCoins: parseInt(e.target.value) || 0 })}
      />
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