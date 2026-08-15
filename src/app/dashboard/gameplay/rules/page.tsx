'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Workflow, Plus, Trash2, AlertTriangle, CheckCircle2, Loader2, Play,
  ShieldCheck, Ban, History, ChevronDown, ChevronUp, RefreshCw, FolderOpen,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { RewardBundleV2Editor } from '@/shared/components/rewards/RewardBundleV2Editor';
import { NodeSlotPicker, nodesInCategory } from '@/shared/components/rewards/NodeSlotPicker';
import { useToast } from '@/store/toast.store';
import rulesService from '@/services/rules.service';
import { buildRuleGraph, type RuleStageSelection } from '@/lib/admin/rule-graph-builder';
import {
  emptyRewardBundle, type RewardBundleV2, type RuleDefinitionKind, type RuleDefinition,
} from '@/types/rules';

const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default', VALIDATED: 'warning', PUBLISHED: 'success', DISABLED: 'danger',
  ROLLED_BACK: 'danger', ARCHIVED: 'danger',
};

export default function RuleEngineAdminPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showNodeBrowser, setShowNodeBrowser] = useState(false);
  const [activeRule, setActiveRule] = useState<RuleDefinition | null>(null);

  const { data: registry, isLoading: registryLoading } = useQuery({
    queryKey: ['rule-node-registry'],
    queryFn: () => rulesService.getNodeRegistry(),
  });

  // ── Durable Admin catalog (GET /admin/rules) — the persistent source of truth. ──
  const [listKind, setListKind] = useState<RuleDefinitionKind | ''>('');
  const [listState, setListState] = useState('');
  const [listOffset, setListOffset] = useState(0);
  const LIST_LIMIT = 20;
  const listQueryKey = ['admin-rules', listKind, listState, listOffset] as const;
  const { data: ruleList, isLoading: listLoading, isFetching: listFetching } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => rulesService.listRules({
      kind: listKind || undefined,
      state: (listState || undefined) as RuleDefinition['state'] | undefined,
      limit: LIST_LIMIT,
      offset: listOffset,
    }),
  });
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['admin-rules'] });

  const loadRuleMutation = useMutation({
    mutationFn: (id: string) => rulesService.getRuleById(id),
    onSuccess: (rule) => setActiveRule(rule),
    onError: (err) => toast.error('Failed to load rule detail.', err),
  });

  // ── Draft form state ──
  const [definitionKey, setDefinitionKey] = useState('');
  const [definitionVersion, setDefinitionVersion] = useState(1);
  const [kind, setKind] = useState<RuleDefinitionKind>('TASK');
  const [targetCount, setTargetCount] = useState('1');
  const [trigger, setTrigger] = useState<{ type: string; config: Record<string, unknown> } | null>(null);
  const [conditions, setConditions] = useState<Array<{ type: string; config: Record<string, unknown> }>>([]);
  const [counter, setCounter] = useState<{ type: string; config: Record<string, unknown> } | null>(null);
  const [window, setWindow] = useState<{ type: string; config: Record<string, unknown> } | null>(null);
  const [rewardBundle, setRewardBundle] = useState<RewardBundleV2>(emptyRewardBundle());

  const stages: RuleStageSelection = { trigger, conditions, counter, window };
  const graph = useMemo(
    () => (registry ? buildRuleGraph(stages, rewardBundle, registry) : { nodes: [], edges: [] }),
    [stages, rewardBundle, registry],
  );

  const [graphValidation, setGraphValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const validateGraphMutation = useMutation({
    mutationFn: () => rulesService.validateGraph(graph),
    onSuccess: (result) => {
      setGraphValidation({ valid: result.valid, errors: result.errors.map((e) => `${e.nodeId ? `[${e.nodeId}] ` : ''}${e.message}`) });
      if (result.valid) toast.success('Graph is valid.');
      else toast.error('Backend rejected this graph.');
    },
    onError: (err) => { toast.error('Graph validation request failed.', err); setGraphValidation(null); },
  });

  const createMutation = useMutation({
    mutationFn: () => rulesService.createRule({
      definitionKey, definitionVersion, kind, graphDefinition: graph, targetCount,
      rewardDefinition: rewardBundle.components.length > 0 ? (rewardBundle as unknown as Record<string, unknown>) : undefined,
    }),
    onSuccess: (rule) => {
      setActiveRule(rule);
      invalidateList();
      toast.success(`Draft "${rule.definitionKey}" v${rule.definitionVersion} created.`, `id: ${rule.id}`);
    },
    onError: (err) => toast.error('Failed to create rule draft.', err),
  });

  // ── Actions on the loaded/active rule (backend-persisted, not session-only) ──
  const [reason, setReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<'publish' | 'disable' | null>(null);

  const validateMutation = useMutation({
    mutationFn: () => rulesService.validateRule(activeRule!.id, reason || 'Validated via Admin dashboard'),
    onSuccess: (rule) => { setActiveRule(rule); invalidateList(); toast.success(`Rule moved to ${rule.state}.`); },
    onError: (err) => toast.error('Validate failed.', err),
  });
  const publishMutation = useMutation({
    mutationFn: () => rulesService.publishRule(activeRule!.id, reason || 'Published via Admin dashboard'),
    onSuccess: (rule) => { setActiveRule(rule); invalidateList(); toast.success('Rule published. It is now immutable.'); setConfirmAction(null); },
    onError: (err) => toast.error('Publish failed.', err),
  });
  const disableMutation = useMutation({
    mutationFn: () => rulesService.disableRule(activeRule!.id, reason || 'Disabled via Admin dashboard'),
    onSuccess: (rule) => { setActiveRule(rule); invalidateList(); toast.success('Rule disabled.'); setConfirmAction(null); },
    onError: (err) => toast.error('Disable failed.', err),
  });

  // ── Standalone rollback (identifies by key+version) ──
  const [rollbackKey, setRollbackKey] = useState('');
  const [rollbackVersion, setRollbackVersion] = useState(1);
  const [rollbackReason, setRollbackReason] = useState('');
  const rollbackMutation = useMutation({
    mutationFn: () => rulesService.rollbackRule(rollbackKey, rollbackVersion, rollbackReason || 'Rolled back via Admin dashboard'),
    onSuccess: (rule) => { invalidateList(); toast.success(`Rolled back to "${rule.definitionKey}" v${rule.definitionVersion}.`); },
    onError: (err) => toast.error('Rollback failed.', err),
  });

  const canCreate = definitionKey.trim().length > 0 && !!trigger && targetCount.trim().length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Rule Engine"
        description="Draft, validate, and publish RuleDefinitions (kind: TASK / ACHIEVEMENT / CAMPAIGN)"
        icon={<Workflow className="w-5 h-5" />}
      />

      {/* ── Durable catalog (GET /admin/rules) ── */}
      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Rule Catalog
              {ruleList && <Badge variant="outline">{ruleList.total} total</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={listKind} onChange={(e) => { setListKind(e.target.value as RuleDefinitionKind | ''); setListOffset(0); }}
                options={[{ value: '', label: 'All kinds' }, { value: 'TASK', label: 'TASK' }, { value: 'ACHIEVEMENT', label: 'ACHIEVEMENT' }, { value: 'CAMPAIGN', label: 'CAMPAIGN' }]} />
              <Select value={listState} onChange={(e) => { setListState(e.target.value); setListOffset(0); }}
                options={[{ value: '', label: 'All states' }, ...Object.keys(STATE_COLOR).map((s) => ({ value: s, label: s }))]} />
              <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: listQueryKey })} disabled={listFetching}>
                <RefreshCw className={`w-3.5 h-3.5 ${listFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {listLoading ? (
            <p className="text-sm text-gray-400 py-4">Loading catalog…</p>
          ) : !ruleList || ruleList.items.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No rules match this filter yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr><th className="py-2 pr-3">Key</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">Kind</th><th className="py-2 pr-3">State</th><th className="py-2 pr-3">Updated</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {ruleList.items.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 font-mono text-xs">{r.definitionKey}</td>
                      <td className="py-2 pr-3">{r.definitionVersion}</td>
                      <td className="py-2 pr-3">{r.kind}</td>
                      <td className="py-2 pr-3"><Badge variant={STATE_COLOR[r.state]}>{r.state}</Badge></td>
                      <td className="py-2 pr-3 text-gray-500">{new Date(r.updatedAt).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="outline" disabled={loadRuleMutation.isPending} onClick={() => loadRuleMutation.mutate(r.id)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{listOffset + 1}–{Math.min(listOffset + LIST_LIMIT, ruleList.total)} of {ruleList.total}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={listOffset === 0} onClick={() => setListOffset((o) => Math.max(0, o - LIST_LIMIT))}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={listOffset + LIST_LIMIT >= ruleList.total} onClick={() => setListOffset((o) => o + LIST_LIMIT)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Node Registry browser ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowNodeBrowser((v) => !v)}>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              Node Registry {registry && <Badge variant="outline">{Object.keys(registry).length} types</Badge>}
            </CardTitle>
            {showNodeBrowser ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardHeader>
        {showNodeBrowser && (
          <CardContent>
            {registryLoading && <p className="text-sm text-gray-400">Loading node registry…</p>}
            {registry && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(['TRIGGER', 'CONDITION', 'LOGIC', 'COUNTER', 'AGGREGATION', 'WINDOW', 'ACTION'] as const).map((cat) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{cat}</p>
                    <ul className="space-y-1">
                      {nodesInCategory(registry, cat).map(([type, d]) => (
                        <li key={type} className="text-xs text-gray-600 dark:text-gray-300">
                          <code className="text-gray-400">{type}</code> — {d.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Create draft ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Create Draft Rule</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input label="Definition key" value={definitionKey} onChange={(e) => setDefinitionKey(e.target.value)} placeholder="e.g. QA_TASK_daily_wins" />
            <Input label="Version" type="number" min={1} value={definitionVersion} onChange={(e) => setDefinitionVersion(Number(e.target.value))} />
            <Select label="Kind" value={kind} onChange={(e) => setKind(e.target.value as RuleDefinitionKind)}
              options={[{ value: 'TASK', label: 'TASK' }, { value: 'ACHIEVEMENT', label: 'ACHIEVEMENT' }, { value: 'CAMPAIGN', label: 'CAMPAIGN' }]} />
            <Input label="Target count" value={targetCount} onChange={(e) => setTargetCount(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>

          <NodeSlotPicker label="Trigger *" registry={registry} category="TRIGGER" value={trigger} onChange={setTrigger} />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conditions (combined with AND when 2+)</label>
              <Button type="button" size="sm" variant="outline" onClick={() => setConditions((c) => [...c, { type: '', config: {} }])}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add condition
              </Button>
            </div>
            {conditions.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1">
                  <NodeSlotPicker label={`Condition ${i + 1}`} registry={registry} category="CONDITION"
                    value={c.type ? c : null}
                    onChange={(v) => setConditions((prev) => prev.map((p, idx) => (idx === i ? (v ?? { type: '', config: {} }) : p)))} />
                </div>
                <button type="button" onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="mt-7 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <NodeSlotPicker label="Counter (optional)" registry={registry} category="COUNTER" value={counter} onChange={setCounter} allowClear />
          <NodeSlotPicker label="Window (optional)" registry={registry} category="WINDOW" value={window} onChange={setWindow} allowClear />

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reward Bundle V2 <span className="text-gray-400 font-normal">(drives Action nodes automatically — one action node per component, bound via rewardComponentId)</span>
            </p>
            <RewardBundleV2Editor value={rewardBundle} onChange={setRewardBundle} />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={() => validateGraphMutation.mutate()} disabled={!trigger || validateGraphMutation.isPending}>
              {validateGraphMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
              Validate graph
            </Button>
            <Button type="button" onClick={() => createMutation.mutate()} disabled={!canCreate || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create draft
            </Button>
            {graphValidation && (
              <span className={`text-xs flex items-center gap-1 ${graphValidation.valid ? 'text-emerald-600' : 'text-red-500'}`}>
                {graphValidation.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {graphValidation.valid ? 'Backend-valid' : `${graphValidation.errors.length} error(s)`}
              </span>
            )}
          </div>
          {graphValidation && !graphValidation.valid && (
            <ul className="text-xs text-red-500 space-y-0.5 pl-4 list-disc">
              {graphValidation.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Active rule lifecycle actions ── */}
      {activeRule && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {activeRule.definitionKey} <span className="text-gray-400 font-normal">v{activeRule.definitionVersion}</span>
              </CardTitle>
              <Badge variant={STATE_COLOR[activeRule.state]}>{activeRule.state}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400">id: {activeRule.id}</p>
            <Input label="Reason (used for validate/publish/disable)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required by backend audit trail" />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" disabled={activeRule.state !== 'DRAFT' || validateMutation.isPending} onClick={() => validateMutation.mutate()}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Validate
              </Button>
              <Button size="sm" variant="outline" disabled={activeRule.state !== 'VALIDATED'} onClick={() => setConfirmAction('publish')}>
                <Play className="w-3.5 h-3.5 mr-1" /> Publish
              </Button>
              <Button size="sm" variant="danger" disabled={activeRule.state !== 'PUBLISHED'} onClick={() => setConfirmAction('disable')}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Disable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Standalone rollback ── */}
      <Card>
        <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><History className="w-4 h-4" /> Roll back a published version</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Input label="Definition key" value={rollbackKey} onChange={(e) => setRollbackKey(e.target.value)} />
          <Input label="Version" type="number" min={1} value={rollbackVersion} onChange={(e) => setRollbackVersion(Number(e.target.value))} />
          <Input label="Reason" value={rollbackReason} onChange={(e) => setRollbackReason(e.target.value)} />
          <Button variant="outline" disabled={!rollbackKey || rollbackMutation.isPending} onClick={() => rollbackMutation.mutate()}>
            {rollbackMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Roll back
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction === 'publish'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Publish rule?"
        message={`"${activeRule?.definitionKey}" v${activeRule?.definitionVersion} will become PUBLISHED and immutable. Players will start matching against it immediately.`}
        confirmText="Publish"
        variant="warning"
        onConfirm={async () => { await publishMutation.mutateAsync(); }}
      />
      <ConfirmDialog
        open={confirmAction === 'disable'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Disable rule?"
        message={`"${activeRule?.definitionKey}" v${activeRule?.definitionVersion} will stop matching new events.`}
        confirmText="Disable"
        variant="danger"
        onConfirm={async () => { await disableMutation.mutateAsync(); }}
      />
    </div>
  );
}
