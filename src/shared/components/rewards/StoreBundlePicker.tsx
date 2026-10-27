'use client';

import { useEffect, useState } from 'react';
import { Search, X, Check } from 'lucide-react';
import apiClient from '@/lib/api/api-client';
import type { StoreBundle } from '@/services/store.service';
import { cn } from '@/shared/lib/utils';

interface StoreBundlePickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

/**
 * Searches the real Store bundle catalog (GET /store/admin/bundles?search=) —
 * the bundle counterpart to ItemBadgePicker. Title + SKU first, UUID shown as
 * secondary metadata only.
 */
export function StoreBundlePicker({ value, onChange, disabled }: StoreBundlePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StoreBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<StoreBundle | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const handle = setTimeout(() => {
      apiClient
        .get<{ data?: StoreBundle[] } | StoreBundle[]>('/store/admin/bundles', {
          params: { search: query || undefined, limit: 20 },
        })
        .then((res) => {
          const rows = Array.isArray(res) ? res : ((res as { data?: StoreBundle[] }).data ?? []);
          setResults(rows);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query, open]);

  useEffect(() => {
    if (!value) { setSelected(null); return; }
    if (selected?.id === value) return;
    apiClient
      .get<StoreBundle>(`/store/admin/bundles/${value}`)
      .then(setSelected)
      .catch(() => setSelected(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const title = (bundle: StoreBundle) =>
    (bundle.title as Record<string, string> | undefined)?.en ?? bundle.sku;

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
          <BundleArtwork bundle={selected} />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
            {title(selected)}
            <span className="text-gray-400 ml-1.5 text-xs">({selected.sku} · {selected.id.slice(0, 8)}…)</span>
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
            placeholder="Search bundles by title/SKU…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-50"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">No bundles found</div>
          )}
          {results.map((bundle) => (
            <button
              key={bundle.id}
              type="button"
              onClick={() => { onChange(bundle.id); setSelected(bundle); setOpen(false); setQuery(''); }}
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                bundle.id === value && 'bg-indigo-50 dark:bg-indigo-900/20',
              )}
            >
              <BundleArtwork bundle={bundle} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium text-gray-900 dark:text-white">{title(bundle)}</span>
                <span className="text-gray-400 ml-1.5">({bundle.sku})</span>
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                {!bundle.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">inactive</span>}
                {bundle.id === value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BundleArtwork({ bundle }: { bundle: StoreBundle }) {
  void bundle;
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-[9px] font-semibold text-cyan-700 dark:text-cyan-300">
      BUNDLE
    </span>
  );
}

export default StoreBundlePicker;
