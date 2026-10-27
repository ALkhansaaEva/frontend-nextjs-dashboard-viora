'use client';

import { useEffect, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import { storeService, type StoreItem } from '@/services/store.service';
import { cn } from '@/shared/lib/utils';

interface ItemBadgePickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/**
 * Searches the real Store catalog instead of asking the operator to type a raw
 * item UUID. Canonical badges use the separate BadgePicker and Badge domain.
 */
export function ItemBadgePicker({ value, onChange, disabled }: ItemBadgePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StoreItem | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      storeService.getAdminItems({ search: query || undefined, limit: 20 })
        .then((res) => {
          setResults(res.data);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.id === value) return;
    storeService.getAdminItemById(value).then(setSelected).catch(() => setSelected(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <ItemArtwork item={selected} />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
            {selected.title?.en ?? selected.code}
            <span className="text-gray-400 font-normal ml-1.5">({selected.code})</span>
          </span>
          {!disabled && (
            <button type="button" onClick={() => { onChange(''); setSelected(null); }} className="text-gray-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            disabled={disabled}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search store items by name/code…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">No items found</div>
          )}
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onChange(item.id); setSelected(item); setOpen(false); setQuery(''); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                item.id === value && 'bg-indigo-50 dark:bg-indigo-900/20',
              )}
            >
              <ItemArtwork item={item} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-gray-900 dark:text-white">{item.title?.en ?? item.code}</span>
                <span className="text-gray-400 ml-1.5">({item.code})</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {!item.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">inactive</span>}
                {item.id === value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemArtwork({ item }: { item: StoreItem }) {
  const source = item.assets.find((asset) => asset.purpose === 'thumbnail')?.url ?? item.assets.find((asset) => asset.url)?.url;
  return source ? (
    // URLs are canonical Store asset URLs returned by the backend.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={source} alt={item.title?.en ?? item.code} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[10px] font-semibold text-blue-600 dark:text-blue-300">
      ITEM
    </span>
  );
}

export default ItemBadgePicker;
