'use client';

import { Package, Gem, Coins, Sparkles, Pencil, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import type { StoreItem } from '@/services/store.service';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  rare: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  epic: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  legendary: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
};

interface StoreItemCardProps {
  item: StoreItem;
  isRTL?: boolean;
  canManage?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StoreItemCard({ item, isRTL, canManage, onClick, onEdit, onDelete }: StoreItemCardProps) {
  const getItemImage = () => {
    if (!item.assets || item.assets.length === 0) return null;
    const iconAsset = item.assets.find(a => a.purpose === 'icon');
    return iconAsset || item.assets[0];
  };
  
  const itemImage = getItemImage();

  return (
    <Card className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden group" onClick={onClick}>
      <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 relative overflow-hidden">
        {itemImage?.url ? (
          <img 
            src={itemImage.url} 
            alt={item.title?.en || item.code}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 group-hover:scale-110 transition-transform" />
          </div>
        )}
        {item.rarity === 'legendary' && (
          <div className="absolute top-2 right-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
        )}
        <div className={`absolute bottom-0 left-0 right-0 h-1 ${rarityColors[item.rarity]?.replace('text-', 'bg-') || 'bg-gray-400'}`} />
      </div>
      <CardContent className="p-3">
        <p className="font-semibold text-sm truncate">{item.title?.[isRTL ? 'ar' : 'en'] || item.title?.en || 'Unknown'}</p>
        <p className="text-xs text-gray-400 font-mono mt-0.5">{item.code}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {item.priceGems > 0 && (
              <div className="flex items-center gap-0.5">
                <Gem className="w-3 h-3 text-purple-500" />
                <span className="text-xs font-medium">{item.priceGems}</span>
              </div>
            )}
            {item.priceCoins > 0 && (
              <div className="flex items-center gap-0.5">
                <Coins className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium">{item.priceCoins}</span>
              </div>
            )}
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${rarityColors[item.rarity]}`}>
            {item.rarity}
          </span>
        </div>
        {canManage && (
          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className="p-1 text-gray-400 hover:text-violet-600 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}