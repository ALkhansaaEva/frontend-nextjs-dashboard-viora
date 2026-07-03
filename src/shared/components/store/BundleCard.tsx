'use client';

import { Gem, Coins } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import type { StoreBundle } from '@/services/store.service';

interface BundleCardProps {
  bundle: StoreBundle;
  isRTL?: boolean;
}

export function BundleCard({ bundle, isRTL }: BundleCardProps) {
  return (
    <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center overflow-hidden">
        {bundle.iconUrl ? (
          <img src={bundle.iconUrl} alt="" className="w-full h-full object-contain p-2" />
        ) : (
          <span className="text-4xl">📦</span>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold">{bundle.title?.[isRTL ? 'ar' : 'en'] || bundle.title?.en || 'Bundle'}</h3>
          <Badge variant={bundle.isActive ? 'success' : 'default'}>
            {bundle.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {(bundle.priceGems ?? 0) > 0 && (
            <>
              <Gem className="w-6 h-6 text-purple-500" />
              <span className="text-3xl font-bold">{bundle.priceGems}</span>
            </>
          )}
          {(bundle.priceCoins ?? 0) > 0 && (
            <>
              <Coins className="w-6 h-6 text-yellow-500" />
              <span className="text-3xl font-bold">{bundle.priceCoins}</span>
            </>
          )}
        </div>
        <p className="text-sm text-gray-500">{bundle.items?.length || 0} items included</p>
      </CardContent>
    </Card>
  );
}