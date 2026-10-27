'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Workflow, Plus, ArrowLeft, FolderOpen, RefreshCw, History } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { RuleBuilder } from '@/shared/components/rule-builder/RuleBuilder';
import { RuleCatalogMobileCard } from '@/shared/components/rule-builder/RuleCatalogMobileCard';
import { useHasPermission } from '@/hooks/usePermissions';
import rulesService from '@/services/rules.service';
import type { RuleDefinitionKind, RuleDefinitionState } from '@/types/rules';
import { humanizeToken, ruleTitle } from '@/shared/lib/labels';

const STATES: RuleDefinitionState[] = [
  'DRAFT',
  'VALIDATED',
  'PUBLISHED',
  'DISABLED',
  'ROLLED_BACK',
  'ARCHIVED',
];
const KINDS: RuleDefinitionKind[] = ['TASK', 'ACHIEVEMENT', 'CAMPAIGN'];
const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default',
  VALIDATED: 'warning',
  PUBLISHED: 'success',
  DISABLED: 'danger',
  ROLLED_BACK: 'danger',
  ARCHIVED: 'danger',
};
const LIST_LIMIT = 20;

/**
 * General-purpose Rule Engine administration — every RuleDefinition
 * regardless of kind, for operators who need direct graph access without
 * going through the Achievements/Tasks domain wrappers (§47 of the migration
 * brief: "Direct Rule Builder must still work independently"). Shares the
 * exact same <RuleBuilder> those two pages embed with `lockKind` — here the
 * Kind selector is left open since this surface spans all three kinds.
 */
export default function RuleEngineAdminPage() {
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('achievements.read');
  const canWrite = hasPermission('achievements.write');

  const [kindFilter, setKindFilter] = useState<RuleDefinitionKind | ''>('');
  const [stateFilter, setStateFilter] = useState<RuleDefinitionState | ''>('');
  const [keyFilter, setKeyFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{ id?: string } | null>(null);

  const listQueryKey = ['admin-rules', kindFilter, stateFilter, keyFilter, offset] as const;
  const {
    data: list,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      rulesService.listRules({
        kind: kindFilter || undefined,
        state: stateFilter || undefined,
        definitionKey: keyFilter.trim() || undefined,
        limit: LIST_LIMIT,
        offset,
      }),
    enabled: canRead,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-rules'] });

  if (selected) {
    return (
      <RuleEditor
        ruleId={selected.id}
        canWrite={canWrite}
        onClose={() => {
          setSelected(null);
          invalidate();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Rule Engine"
        description="Every RuleDefinition (TASK / ACHIEVEMENT / CAMPAIGN) — the same graph canvas Achievements and Tasks embed, with direct access to all kinds."
        icon={<Workflow className="w-5 h-5" />}
        action={
          canWrite
            ? {
                label: 'New Rule',
                onClick: () => setSelected({}),
                icon: <Plus className="w-4 h-4" />,
              }
            : undefined
        }
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>achievements.read</code>.
        </div>
      ) : (
        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FolderOpen className="w-4 h-4" /> Catalog
                {list && <Badge variant="outline">{list.total} total</Badge>}
              </CardTitle>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Input
                  placeholder="Definition key (exact)"
                  value={keyFilter}
                  onChange={(e) => {
                    setKeyFilter(e.target.value);
                    setOffset(0);
                  }}
                  className="w-full sm:w-52"
                />
                <Select
                  value={kindFilter}
                  onChange={(e) => {
                    setKindFilter(e.target.value as RuleDefinitionKind | '');
                    setOffset(0);
                  }}
                  options={[
                    { value: '', label: 'All kinds' },
                    ...KINDS.map((k) => ({ value: k, label: k })),
                  ]}
                />
                <Select
                  value={stateFilter}
                  onChange={(e) => {
                    setStateFilter(e.target.value as RuleDefinitionState | '');
                    setOffset(0);
                  }}
                  options={[
                    { value: '', label: 'All states' },
                    ...STATES.map((s) => ({ value: s, label: s })),
                  ]}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: listQueryKey })}
                  disabled={isFetching}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={!list || list.items.length === 0}
              emptyMessage="No rules match this filter yet."
              onRetry={() => refetch()}
            >
              {list && (
                <div>
                  <div className="space-y-2 md:hidden">
                    {list.items.map((r) => (
                      <RuleCatalogMobileCard
                        key={r.id}
                        rule={r}
                        title={ruleTitle(r)}
                        detailLabel="Kind"
                        detailValue={humanizeToken(r.kind)}
                        onOpen={() => setSelected({ id: r.id })}
                      />
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="py-2 pr-3">Key</th>
                          <th className="py-2 pr-3">Version</th>
                          <th className="py-2 pr-3">Kind</th>
                          <th className="py-2 pr-3">State</th>
                          <th className="py-2 pr-3">Updated</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {list.items.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                            onClick={() => setSelected({ id: r.id })}
                          >
                            <td className="py-2 pr-3">
                              <p className="text-xs font-medium">{ruleTitle(r)}</p>
                              <p className="font-mono text-[10px] text-gray-400">
                                {r.definitionKey}
                              </p>
                            </td>
                            <td className="py-2 pr-3">{r.definitionVersion}</td>
                            <td className="py-2 pr-3">{humanizeToken(r.kind)}</td>
                            <td className="py-2 pr-3">
                              <Badge variant={STATE_COLOR[r.state]}>{humanizeToken(r.state)}</Badge>
                            </td>
                            <td className="py-2 pr-3 text-gray-500">
                              {new Date(r.updatedAt).toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected({ id: r.id });
                                }}
                              >
                                Open
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>
                      {offset + 1}–{Math.min(offset + LIST_LIMIT, list.total)} of {list.total}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset === 0}
                        onClick={() => setOffset((o) => Math.max(0, o - LIST_LIMIT))}
                      >
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={offset + LIST_LIMIT >= list.total}
                        onClick={() => setOffset((o) => o + LIST_LIMIT)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-900/20 p-3 text-xs text-sky-800 dark:text-sky-300">
        <History className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Prefer the domain pages for day-to-day authoring — <code>/dashboard/achievements</code>{' '}
          for kind=ACHIEVEMENT, <code>/dashboard/meta/tasks</code> for kind=TASK. This page is the
          direct, kind-agnostic Rule Engine surface for CAMPAIGN rules and cross-domain
          administration.
        </p>
      </div>
    </div>
  );
}

function RuleEditor({
  ruleId,
  canWrite,
  onClose,
}: {
  ruleId?: string;
  canWrite: boolean;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" onClick={onClose}>
        <ArrowLeft className="w-4 h-4" /> Back to catalog
      </Button>
      <RuleBuilder ruleId={ruleId} readOnly={!canWrite} />
    </div>
  );
}
