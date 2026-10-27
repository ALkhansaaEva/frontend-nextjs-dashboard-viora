'use client';

import { useEffect, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import apiClient from '@/lib/api/api-client';
import { cn } from '@/shared/lib/utils';

interface VoucherDefinitionOption {
  value: string;
  label: string;
  definitionKey: string;
  definitionVersion: number;
  effectType: string;
  status: string;
}

interface VoucherDefinitionPickerProps {
  value: string;
  onChange: (definitionKey: string) => void;
  disabled?: boolean;
}

/** Selects a published VoucherDefinition while persisting its canonical definitionKey. */
export function VoucherDefinitionPicker({
  value,
  onChange,
  disabled,
}: VoucherDefinitionPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<VoucherDefinitionOption[]>([]);
  const [selected, setSelected] = useState<VoucherDefinitionOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open && !value) return;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void apiClient
        .get<VoucherDefinitionOption[]>('/admin/vouchers/definitions/options', {
          params: {
            status: 'PUBLISHED',
            search: query || value || undefined,
            limit: 50,
          },
        })
        .then((options) => {
          setResults(options);
          if (value)
            setSelected(
              options.find((option) => option.definitionKey === value) ?? null,
            );
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [open, query, value]);

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
            {selected.label}
            <span className="ms-1.5 text-xs text-gray-400">
              {selected.status}
            </span>
          </span>
          {!disabled && (
            <button
              type="button"
              className="text-gray-400 hover:text-red-500"
              onClick={() => {
                onChange('');
                setSelected(null);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            disabled={disabled}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={value || 'Search published voucher definitions…'}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pe-3 ps-9 text-sm text-gray-900 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
      )}

      {open && !selected && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {loading && (
            <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              No published voucher definitions found
            </div>
          )}
          {results.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.definitionKey);
                setSelected(option);
                setOpen(false);
                setQuery('');
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                option.definitionKey === value &&
                  'bg-indigo-50 dark:bg-indigo-900/20',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-gray-900 dark:text-white">
                  {option.label}
                </span>
                <span className="text-xs text-gray-400">
                  {option.effectType} · {option.status}
                </span>
              </span>
              {option.definitionKey === value && (
                <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default VoucherDefinitionPicker;
