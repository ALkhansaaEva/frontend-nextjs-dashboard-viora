'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink, X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { QueryState } from '@/shared/components/ui/QueryState';
import rulesService from '@/services/rules.service';
import type { RuleDefinitionSummary } from '@/types/rules';

/**
 * Backend-driven Rule picker. Replaces manual UUID entry: search by
 * definition key, filter by kind/state, select published rules, and jump
 * to the Rule Builder. Technical ids stay visible but secondary.
 */
interface RuleSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Restrict selectable kinds (e.g. only TASK rules). */
  kindFilter?: 'TASK' | 'ACHIEVEMENT' | 'CAMPAIGN';
  disabled?: boolean;
}

const STATE_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'VALIDATED', label: 'VALIDATED' },
  { value: 'PUBLISHED', label: 'PUBLISHED' },
  { value: 'DISABLED', label: 'DISABLED' },
];

export function RuleSelector({ selectedIds, onChange, kindFilter, disabled }: RuleSelectorProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState('PUBLISHED');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rule-selector', kindFilter ?? 'ALL', state, debounced],
    queryFn: () =>
      rulesService.listRules({
        kind: kindFilter,
        state: (state || undefined) as import('@/types/rules').RuleDefinitionState | undefined,
        definitionKey: debounced || undefined,
        limit: 20,
      }),
  });
  const rules: RuleDefinitionSummary[] = data?.items ?? [];
  const selectedRules = rules.filter((rule) => selectedIds.includes(rule.id));

  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            className="pl-8"
            placeholder="Search definition key…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-40"
          value={state}
          onChange={(e) => setState(e.target.value)}
          options={STATE_OPTIONS}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const known = selectedRules.find((rule) => rule.id === id);
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 font-mono text-xs text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
              >
                {known ? `${known.definitionKey} v${known.definitionVersion}` : id.slice(0, 8)}
                {!disabled && (
                  <button
                    type="button"
                    aria-label="Remove rule"
                    onClick={() => toggle(id)}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rules.length === 0}
        emptyMessage="No rules match this filter."
        onRetry={() => refetch()}
      >
        <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-700">
          {rules.map((rule) => (
            <li key={rule.id}>
              <label
                className={`flex items-center gap-3 px-3 py-2 text-sm ${
                  disabled ? 'opacity-60' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(rule.id)}
                  disabled={disabled}
                  onChange={() => toggle(rule.id)}
                />
                <span className="flex-1">
                  <span className="font-mono text-xs font-semibold">
                    {rule.definitionKey}{' '}
                    <span className="text-gray-400">v{rule.definitionVersion}</span>
                  </span>
                  <span className="ml-2 text-xs text-gray-400">{rule.kind}</span>
                </span>
                <Badge
                  variant={
                    rule.state === 'PUBLISHED'
                      ? 'success'
                      : rule.state === 'DRAFT'
                        ? 'default'
                        : 'danger'
                  }
                >
                  {rule.state}
                </Badge>
                <Link
                  href="/dashboard/gameplay/rules"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  title="Open in Rule Builder"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </Link>
              </label>
            </li>
          ))}
        </ul>
      </QueryState>
    </div>
  );
}

export default RuleSelector;
