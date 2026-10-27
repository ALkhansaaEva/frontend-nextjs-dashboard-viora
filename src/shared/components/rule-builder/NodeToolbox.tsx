'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { NODE_KIND_META, NODE_KIND_ORDER, humaniseNodeType } from '@/shared/config/rule-nodes';
import type { RuleNodeKind, NodeRegistryResponse } from '@/types/rules';

interface NodeToolboxProps {
  registry: NodeRegistryResponse;
  onAddNode: (type: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Left rail listing every node type the BACKEND registry advertises, grouped by
 * kind. Nodes are added by click or by dragging onto the canvas.
 */
export function NodeToolbox({ registry, onAddNode, disabled, className }: NodeToolboxProps) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [collapsed, setCollapsed] = useState<Partial<Record<RuleNodeKind, boolean>>>({});

  const grouped = useMemo(() => {
    const groups = new Map<RuleNodeKind, string[]>();
    const needle = deferredQuery.trim().toLowerCase();

    for (const [type, descriptor] of Object.entries(registry)) {
      const label = descriptor.label || humaniseNodeType(type);
      const haystack = `${type} ${label} ${descriptor.description ?? ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      const list = groups.get(descriptor.kind) ?? [];
      list.push(type);
      groups.set(descriptor.kind, list);
    }
    for (const list of groups.values()) list.sort();
    return groups;
  }, [registry, deferredQuery]);

  const totalMatches = useMemo(
    () => [...grouped.values()].reduce((sum, list) => sum + list.length, 0),
    [grouped],
  );

  return (
    <aside
      className={cn(
        'flex h-full w-52 shrink-0 flex-col border-e border-gray-200 bg-white max-xl:w-44 max-lg:h-[58svh] max-lg:min-h-[340px] max-lg:w-full max-lg:border-b-0 max-lg:border-e-0 dark:border-gray-800 dark:bg-gray-900',
        className,
      )}
    >
      <div className="border-b border-gray-200 p-3 dark:border-gray-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Node library
        </h3>
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes…"
            aria-label="Search nodes"
            className={cn(
              'w-full rounded-lg border border-gray-300 bg-gray-50 py-1.5 ps-8 pe-2 text-sm',
              'text-gray-900 placeholder:text-gray-400',
              'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500',
              'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
            )}
          />
        </div>
        <p className="mt-2 text-[11px] text-gray-400">
          {totalMatches} of {Object.keys(registry).length} node types
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {NODE_KIND_ORDER.map((kind) => {
          const types = grouped.get(kind);
          if (!types?.length) return null;
          const meta = NODE_KIND_META[kind];
          const isCollapsed = collapsed[kind] ?? false;

          return (
            <section key={kind} className="mb-2">
              <button
                type="button"
                onClick={() => setCollapsed((prev) => ({ ...prev, [kind]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span className="flex items-center gap-2">
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1', meta.chipClass)}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-gray-400">{types.length}</span>
                </span>
                <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isCollapsed && '-rotate-90 rtl:rotate-90')} />
              </button>

              {!isCollapsed && (
                <ul className="mt-1 space-y-0.5">
                  {types.map((type) => {
                    const descriptor = registry[type];
                    if (!descriptor) return null;
                    const label = descriptor.label || humaniseNodeType(type);
                    return (
                      <li key={type}>
                        <button
                          type="button"
                          disabled={disabled}
                          draggable={!disabled}
                          onDragStart={(event) => {
                            event.dataTransfer.setData('application/viora-rule-node', type);
                            event.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => onAddNode(type)}
                          title={descriptor.description ? `${type} — ${descriptor.description}` : `${type} — click to add, or drag onto the canvas`}
                          className={cn(
                            'w-full truncate rounded-md px-2 py-1.5 text-start text-xs',
                            'text-gray-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700',
                            'dark:text-gray-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                          )}
                        >
                          {label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}

        {totalMatches === 0 && (
          <p className="px-2 py-6 text-center text-xs text-gray-400">
            No node types match “{query}”.
          </p>
        )}
      </div>
    </aside>
  );
}

export default NodeToolbox;
