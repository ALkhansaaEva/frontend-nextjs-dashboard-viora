'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ListChecks, Plus, AlertTriangle, ArrowLeft, FolderOpen, RefreshCw, Pencil } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { Modal } from '@/shared/components/ui/Modal';
import { RuleBuilder } from '@/shared/components/rule-builder/RuleBuilder';
import { RuleCatalogMobileCard } from '@/shared/components/rule-builder/RuleCatalogMobileCard';
import { RuleProgressPanel } from '@/shared/components/rule-builder/RuleProgressPanel';
import { RuleMediaField } from '@/shared/components/rules/RuleMediaField';
import { useHasPermission } from '@/hooks/usePermissions';
import tasksService, { type TaskMetadata } from '@/services/tasks.service';
import { normalizeDefinitionKeyInput, type RuleDefinition, type RuleDefinitionState } from '@/types/rules';
import { humanizeToken } from '@/shared/lib/labels';

const STATES: RuleDefinitionState[] = ['DRAFT', 'VALIDATED', 'PUBLISHED', 'DISABLED', 'ROLLED_BACK', 'ARCHIVED'];
const WINDOWS = ['Daily', 'Weekly', 'Monthly', 'Lifetime'] as const;
const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default', VALIDATED: 'warning', PUBLISHED: 'success', DISABLED: 'danger',
  ROLLED_BACK: 'danger', ARCHIVED: 'danger',
};
const LIST_LIMIT = 20;

function readMetadata(metadata: Record<string, unknown> | undefined): TaskMetadata {
  const m = (metadata ?? {}) as Partial<TaskMetadata>;
  return { titleI18n: m.titleI18n ?? {}, descriptionI18n: m.descriptionI18n, taskType: m.taskType };
}

/**
 * Tasks are `RuleDefinition.kind = 'TASK'` — no standalone TaskDefinition
 * backend model exists (verified in tasks.service.ts). Shares the exact same
 * RuleBuilder component as /dashboard/achievements and /dashboard/gameplay/rules
 * — see §5/§40 of the migration brief ("Do NOT create a separate
 * TaskRuleBuilder").
 */
export default function TasksPage() {
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  // RuleAdminController (kind=TASK) is gated on the same achievements.* codes
  // as Achievements — there is no separate "tasks" permission on the backend
  // (see admin-routes.ts §"meta-tasks" for the same finding at route level).
  const canRead = hasPermission('achievements.read');
  const canWrite = hasPermission('achievements.write');

  const [stateFilter, setStateFilter] = useState<RuleDefinitionState | ''>('');
  const [windowFilter, setWindowFilter] = useState<string>('');
  const [keyFilter, setKeyFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{ id?: string } | null>(null);

  const listQueryKey = ['admin-rules', 'TASK', stateFilter, keyFilter, windowFilter, offset] as const;
  const { data: list, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => tasksService.listTasks({
      state: stateFilter || undefined,
      window: (windowFilter || undefined) as import('@/types/rules').RuleWindowType | undefined,
      definitionKey: keyFilter.trim() || undefined,
      limit: LIST_LIMIT,
      offset,
    }),
    enabled: canRead,
  });

  const draftStat = useQuery({ queryKey: ['admin-rules', 'TASK', 'stat', 'DRAFT'], queryFn: () => tasksService.listTasks({ state: 'DRAFT', limit: 1 }), enabled: canRead });
  const validatedStat = useQuery({ queryKey: ['admin-rules', 'TASK', 'stat', 'VALIDATED'], queryFn: () => tasksService.listTasks({ state: 'VALIDATED', limit: 1 }), enabled: canRead });
  const publishedStat = useQuery({ queryKey: ['admin-rules', 'TASK', 'stat', 'PUBLISHED'], queryFn: () => tasksService.listTasks({ state: 'PUBLISHED', limit: 1 }), enabled: canRead });
  const disabledStat = useQuery({ queryKey: ['admin-rules', 'TASK', 'stat', 'DISABLED'], queryFn: () => tasksService.listTasks({ state: 'DISABLED', limit: 1 }), enabled: canRead });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-rules', 'TASK'] });

  if (selected) {
    return <TaskEditor ruleId={selected.id} canWrite={canWrite} onClose={() => { setSelected(null); invalidate(); }} />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Tasks"
        description="RuleDefinition (kind: TASK) — authored, validated, and published through the same Rule Engine as Achievements and Rules."
        icon={<ListChecks className="w-5 h-5" />}
        action={canWrite ? { label: 'Create Task', onClick: () => setSelected({}), icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>achievements.read</code>.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Draft" value={draftStat.data?.total} variant="default" />
            <StatCard label="Validated" value={validatedStat.data?.total} variant="warning" />
            <StatCard label="Published" value={publishedStat.data?.total} variant="success" />
            <StatCard label="Disabled" value={disabledStat.data?.total} variant="danger" />
          </div>

          <RuleProgressPanel kind="TASK" />

          {!canWrite && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500">
              Read-only — you have <code>achievements.read</code> without <code>achievements.write</code>.
            </div>
          )}

          <Card padding="none">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Catalog
                  {list && <Badge variant="outline">{list.total} total</Badge>}
                </CardTitle>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Input placeholder="Definition key (exact)" value={keyFilter}
                    onChange={(e) => { setKeyFilter(e.target.value); setOffset(0); }} className="w-full sm:w-56" />
                  <Select value={windowFilter} onChange={(e) => { setWindowFilter(e.target.value); setOffset(0); }}
                    className="w-40"
                    options={[{ value: '', label: 'All windows' }, ...WINDOWS.map((w) => ({ value: w, label: humanizeToken(w) }))]} />
                  <Select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value as RuleDefinitionState | ''); setOffset(0); }}
                    options={[{ value: '', label: 'Active states' }, ...STATES.map((s) => ({ value: s, label: humanizeToken(s) }))]} />
                  <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: listQueryKey })} disabled={isFetching}>
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
                emptyMessage="No tasks match this filter yet."
                onRetry={() => refetch()}
              >
                {list && (
                <div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {list.items.map((r) => {
                      const meta = readMetadata(r.metadata);
                      return (
                        <RuleCatalogMobileCard
                          key={r.id}
                          rule={r}
                          title={meta.titleI18n?.en || humanizeToken(r.definitionKey)}
                          detailLabel="Type"
                          detailValue={humanizeToken(meta.taskType)}
                          onOpen={() => setSelected({ id: r.id })}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                    <span>{offset + 1}–{Math.min(offset + LIST_LIMIT, list.total)} of {list.total}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - LIST_LIMIT))}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={offset + LIST_LIMIT >= list.total} onClick={() => setOffset((o) => o + LIST_LIMIT)}>Next</Button>
                    </div>
                  </div>
                </div>
                )}
              </QueryState>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, variant }: { label: string; value: number | undefined; variant: 'default' | 'success' | 'warning' | 'danger' }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value === undefined ? <span className="text-gray-300 dark:text-gray-600">…</span> : value}
      </p>
      <Badge variant={variant} className="mt-1 text-[10px]">{label}</Badge>
    </Card>
  );
}

const TASK_TYPES = ['daily', 'weekly', 'one_time', 'counter'] as const;

function TaskEditor({ ruleId, canWrite, onClose }: { ruleId?: string; canWrite: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [version, setVersion] = useState(1);
  const [targetCount, setTargetCount] = useState('1');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<string>('one_time');
  const [loadedRule, setLoadedRule] = useState<RuleDefinition | null>(null);
  const [isDraftingNewVersion, setIsDraftingNewVersion] = useState(false);
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(!ruleId);

  const isNew = !ruleId;
  const identityLocked = !isNew && !isDraftingNewVersion;
  const canEditBasicInfo = canWrite && (!loadedRule || loadedRule.state === 'DRAFT');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClose}><ArrowLeft className="w-4 h-4" /> Back to catalog</Button>
        {loadedRule && <Badge variant={STATE_COLOR[loadedRule.state]}>{humanizeToken(loadedRule.state)}</Badge>}
      </div>

      {!canWrite && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Viewing in read-only mode — you have <code>achievements.read</code> without <code>achievements.write</code>.
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Basic info</p>
          <p className="mt-1 truncate font-mono text-sm text-slate-800 dark:text-slate-100">
            {code || 'New task'} · v{version} · target {targetCount} · {humanizeToken(taskType)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsBasicInfoOpen(true)}>
          <Pencil className="h-4 w-4" /> {canEditBasicInfo ? 'Edit basic info' : 'View basic info'}
        </Button>
      </div>
      {loadedRule && loadedRule.state !== 'DRAFT' && (
        <p className="text-xs text-amber-700 dark:text-amber-300">This version is immutable. Use <strong>New version</strong> in the toolbar to edit its graph, rewards, artwork, or basic info.</p>
      )}

      <Modal isOpen={isBasicInfoOpen} onClose={() => setIsBasicInfoOpen(false)} title="Task basic info" size="xl">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Input label="Definition key" disabled={!canEditBasicInfo || identityLocked} value={code}
              onChange={(e) => setCode(normalizeDefinitionKeyInput(e.target.value))} placeholder="task_daily_wins" className="font-mono" />
            <Input label="Version" type="number" min={1} disabled={!canEditBasicInfo || identityLocked} value={version}
              onChange={(e) => setVersion(Number(e.target.value) || 1)} />
            <Select label="Task type (display only)" disabled={!canEditBasicInfo} value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              options={TASK_TYPES.map((t) => ({ value: t, label: t }))} />
            <Input label="Target count" disabled={!canEditBasicInfo} value={targetCount}
              onChange={(e) => setTargetCount(e.target.value.replace(/[^0-9]/g, '') || '1')} className="font-mono" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Input label="Title (EN)" disabled={!canEditBasicInfo} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <Input label="Title (AR)" dir="rtl" disabled={!canEditBasicInfo} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </div>
          <Input label="Description (EN, optional)" disabled={!canEditBasicInfo} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
          <RuleMediaField
            value={mediaId}
            onChange={setMediaId}
            bucket="tasks"
            purpose="task-artwork"
            disabled={!canEditBasicInfo}
          />
          <p className="text-[11px] text-gray-400">
            Scheduling/window semantics (daily reset, weekly reset, …) are expressed on the canvas as real backend
            Trigger/Window nodes (e.g. a <code>DAILY_RESET</code> trigger), not as a separate frontend-only field —
            &quot;Task type&quot; above is a display label only.
          </p>
          <div className="flex justify-end border-t border-gray-200 pt-3 dark:border-gray-700">
            <Button size="sm" onClick={() => setIsBasicInfoOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      <RuleBuilder
        ruleId={ruleId}
        lockKind="TASK"
        hideIdentity
        identity={{ definitionKey: code, definitionVersion: version, targetCount }}
        readOnly={!canWrite}
        mediaId={mediaId}
        extraMetadata={{
          titleI18n: { en: titleEn, ...(titleAr ? { ar: titleAr } : {}) },
          descriptionI18n: descriptionEn ? { en: descriptionEn } : undefined,
          taskType,
        }}
        onNewVersionDraft={(nextVersion) => {
          setVersion(nextVersion);
          setIsDraftingNewVersion(true);
        }}
        onRuleChange={(loaded) => {
          setLoadedRule(loaded);
          if (!loaded) return;
          setIsDraftingNewVersion(false);
          setCode(loaded.definitionKey);
          setVersion(loaded.definitionVersion);
          setTargetCount(loaded.targetCount);
          setMediaId(loaded.mediaId ?? null);
          const meta = readMetadata(loaded.metadata);
          setTitleEn(meta.titleI18n.en ?? '');
          setTitleAr(meta.titleI18n.ar ?? '');
          setDescriptionEn(meta.descriptionI18n?.en ?? '');
          setTaskType(meta.taskType ?? 'one_time');
        }}
      />
    </div>
  );
}
