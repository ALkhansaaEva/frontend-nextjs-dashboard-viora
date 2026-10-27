'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, Eye, Gift, RefreshCw } from 'lucide-react';

import rulesService from '@/services/rules.service';
import type { RuleDefinitionKind, RuleProgressItem } from '@/types/rules';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState } from '@/shared/components/ui/QueryState';

const PAGE_SIZE = 20;

function readTitle(item: RuleProgressItem): string {
  const titles = item.metadata?.titleI18n;
  if (titles && typeof titles === 'object') {
    const map = titles as Record<string, unknown>;
    if (typeof map.en === 'string' && map.en.trim()) return map.en;
    if (typeof map.ar === 'string' && map.ar.trim()) return map.ar;
  }
  return item.definitionKey;
}

function ratio(value: string, target: string): number {
  try {
    const current = BigInt(value || '0');
    const maximum = BigInt(target || '1');
    if (maximum <= BigInt(0)) return 0;
    const bounded = current < BigInt(0) ? BigInt(0) : current > maximum ? maximum : current;
    return Number((bounded * BigInt(1000)) / maximum) / 10;
  } catch {
    return 0;
  }
}

export function calculateRuleProgressPercent(item: RuleProgressItem): number {
  if (!item.stages.length) return ratio(item.progress.value, item.progress.target);
  const total = item.stages.reduce((sum, stage) => sum + ratio(stage.value, stage.target), 0);
  return Math.round((total / item.stages.length) * 10) / 10;
}

function deliveryLabel(item: RuleProgressItem): { label: string; variant: 'default' | 'success' | 'warning' | 'danger' } {
  if (!item.completed) return { label: 'In progress', variant: 'default' };
  if (!item.reward.components.length) return { label: 'Completed', variant: 'success' };
  if (!item.reward.delivery.length) return { label: 'Reward queued', variant: 'warning' };
  if (item.reward.delivery.some((part) => part.status === 'FAILED_FINAL')) return { label: 'Reward failed', variant: 'danger' };
  if (item.reward.delivery.every((part) => part.status === 'SUCCEEDED')) return { label: 'Reward delivered', variant: 'success' };
  return { label: 'Reward processing', variant: 'warning' };
}

export function RuleProgressPanel({ kind }: { kind: Extract<RuleDefinitionKind, 'TASK' | 'ACHIEVEMENT'> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ['my-rule-progress', kind, offset],
    queryFn: () => rulesService.getProgress(kind, { limit: PAGE_SIZE, offset }),
    enabled: isOpen,
  });

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
          <Eye className="h-4 w-4" />
          Player progress preview
        </Button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Player progress preview"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-2xl text-xs leading-5 text-gray-500 dark:text-gray-400">
              Live progress for the signed-in account. Rewards are granted automatically and idempotently after completion.
            </p>
            <Button size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>

          <QueryState
            isLoading={query.isLoading}
            isError={query.isError}
            error={query.error}
            isEmpty={!query.data?.items.length}
            emptyMessage={`No published ${kind === 'TASK' ? 'tasks' : 'achievements'} are visible for this account yet.`}
            onRetry={() => query.refetch()}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              {query.data?.items.map((item) => {
                const percent = calculateRuleProgressPercent(item);
                const delivery = deliveryLabel(item);
                return (
                  <article key={item.id} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{readTitle(item)}</h3>
                        <p className="truncate font-mono text-[10px] text-gray-400">{item.definitionKey} · v{item.definitionVersion}</p>
                      </div>
                      <Badge variant={delivery.variant}>{delivery.label}</Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>{item.progress.mode === 'STAGES' ? `${item.progress.value}/${item.progress.target} stages` : `${item.progress.value}/${item.progress.target}`}</span>
                      <span className="font-semibold">{percent}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${percent}%` }} />
                    </div>

                    {item.stages.length > 0 && (
                      <ol className="mt-3 space-y-2">
                        {item.stages.map((stage) => {
                          const stagePercent = ratio(stage.value, stage.target);
                          return (
                            <li key={stage.id} className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="min-w-0 truncate font-medium">{stage.order}. {stage.key}</span>
                                <span className="shrink-0 font-mono">{stage.value}/{stage.target}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="h-full rounded-full bg-sky-500" style={{ width: `${stagePercent}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    {item.reward.components.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                        <Gift className="h-3.5 w-3.5" />
                        {item.reward.components.map((part) => (
                          <span key={part.id} className="rounded-md bg-gray-200 px-1.5 py-0.5 dark:bg-gray-800">
                            {part.type}{part.amount ? ` +${part.amount}` : part.quantity ? ` ×${part.quantity}` : ''}
                          </span>
                        ))}
                        {item.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock3 className="h-3.5 w-3.5 text-gray-400" />}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </QueryState>

          {query.data && query.data.total > PAGE_SIZE && (
            <div className="flex flex-col gap-2 border-t border-gray-200 pt-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
              <span>{offset + 1}–{Math.min(offset + PAGE_SIZE, query.data.total)} of {query.data.total}</span>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>Prev</Button>
                <Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= query.data.total} onClick={() => setOffset((value) => value + PAGE_SIZE)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
