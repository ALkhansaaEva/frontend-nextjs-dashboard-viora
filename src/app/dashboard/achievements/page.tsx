'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Plus, AlertTriangle, Loader2, Play, ShieldCheck, Ban, Trash2,
  FolderOpen, RefreshCw,
} from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog';
import { RewardBundleV2Editor } from '@/shared/components/rewards/RewardBundleV2Editor';
import { NodeSlotPicker } from '@/shared/components/rewards/NodeSlotPicker';
import { useToast } from '@/store/toast.store';
import { useHasPermission } from '@/hooks/usePermissions';
import rulesService from '@/services/rules.service';
import achievementsService, { type AchievementMetadata } from '@/services/achievements.service';
import { buildRuleGraph, type RuleStageSelection } from '@/lib/admin/rule-graph-builder';
import { emptyRewardBundle, type RewardBundleV2, type RuleDefinition } from '@/types/rules';

const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default', VALIDATED: 'warning', PUBLISHED: 'success', DISABLED: 'danger',
  ROLLED_BACK: 'danger', ARCHIVED: 'danger',
};

const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;

export default function AchievementsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const canManage = useHasPermission()('achievements.write');
  const [activeAchievement, setActiveAchievement] = useState<RuleDefinition | null>(null);

  const { data: registry } = useQuery({ queryKey: ['rule-node-registry'], queryFn: () => rulesService.getNodeRegistry() });

  // ── Durable catalog (GET /admin/rules?kind=ACHIEVEMENT) ──
  const [listState, setListState] = useState('');
  const [listOffset, setListOffset] = useState(0);
  const LIST_LIMIT = 20;
  const listQueryKey = ['admin-rules', 'ACHIEVEMENT', listState, listOffset] as const;
  const { data: list, isLoading: listLoading, isFetching: listFetching } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => achievementsService.listAchievements({
      state: (listState || undefined) as RuleDefinition['state'] | undefined,
      limit: LIST_LIMIT, offset: listOffset,
    }),
  });
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['admin-rules', 'ACHIEVEMENT'] });
  const loadMutation = useMutation({
    mutationFn: (id: string) => achievementsService.getAchievementById(id),
    onSuccess: (rule) => setActiveAchievement(rule),
    onError: (err) => toast.error('Failed to load achievement detail.', err),
  });

  // ── Identity + metadata ──
  const [code, setCode] = useState('');
  const [version, setVersion] = useState(1);
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [rarity, setRarity] = useState<AchievementMetadata['rarity']>('common');
  const [isHidden, setIsHidden] = useState(false);
  const [targetCount, setTargetCount] = useState('1');

  // ── Criteria (Rule graph) ──
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

  const [reason, setReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<'publish' | 'disable' | null>(null);

  const createMutation = useMutation({
    mutationFn: () => achievementsService.createAchievement({
      code, version,
      metadata: {
        titleI18n: { en: titleEn, ...(titleAr ? { ar: titleAr } : {}) },
        descriptionI18n: descriptionEn ? { en: descriptionEn } : undefined,
        rarity, isHidden,
      },
      graphDefinition: graph,
      targetCount,
      rewardBundle: rewardBundle.components.length > 0 ? rewardBundle : undefined,
    }),
    onSuccess: (rule) => { setActiveAchievement(rule); invalidateList(); toast.success(`Achievement draft "${rule.definitionKey}" created.`); },
    onError: (err) => toast.error('Failed to create achievement draft.', err),
  });

  const validateMutation = useMutation({
    mutationFn: () => achievementsService.validateAchievement(activeAchievement!.id, reason || 'Validated via Admin dashboard'),
    onSuccess: (rule) => { setActiveAchievement(rule); invalidateList(); toast.success(`Achievement moved to ${rule.state}.`); },
    onError: (err) => toast.error('Validate failed.', err),
  });
  const publishMutation = useMutation({
    mutationFn: () => achievementsService.publishAchievement(activeAchievement!.id, reason || 'Published via Admin dashboard'),
    onSuccess: (rule) => { setActiveAchievement(rule); invalidateList(); toast.success('Achievement published.'); setConfirmAction(null); },
    onError: (err) => toast.error('Publish failed.', err),
  });
  const disableMutation = useMutation({
    mutationFn: () => achievementsService.disableAchievement(activeAchievement!.id, reason || 'Disabled via Admin dashboard'),
    onSuccess: (rule) => { setActiveAchievement(rule); invalidateList(); toast.success('Achievement disabled.'); setConfirmAction(null); },
    onError: (err) => toast.error('Disable failed.', err),
  });

  const canCreate = canManage && code.trim().length > 0 && titleEn.trim().length > 0 && !!trigger;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader title="Achievements" description="Domain-specific authoring view over the Rule Engine (kind: ACHIEVEMENT)" icon={<Trophy className="w-5 h-5" />} />

      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          <strong>Verified against source, not assumed:</strong> there is no <code>/admin/achievements</code> and no
          <code> /achievements*</code> route anywhere in the backend. Achievements only exist as{' '}
          <code>RuleDefinition.kind=&apos;ACHIEVEMENT&apos;</code>, authored via <code>POST /admin/rules</code> and
          listed durably via <code>GET /admin/rules?kind=ACHIEVEMENT</code> below — no browser-local catalog.
        </p>
      </div>

      {!canManage && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>achievements.write</code> — authoring is disabled.
        </div>
      )}

      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Achievement Catalog
              {list && <Badge variant="outline">{list.total} total</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
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
          ) : !list || list.items.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No achievements match this filter yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr><th className="py-2 pr-3">Key</th><th className="py-2 pr-3">Version</th><th className="py-2 pr-3">State</th><th className="py-2 pr-3">Updated</th><th /></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {list.items.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-3 font-mono text-xs">{r.definitionKey}</td>
                      <td className="py-2 pr-3">{r.definitionVersion}</td>
                      <td className="py-2 pr-3"><Badge variant={STATE_COLOR[r.state]}>{r.state}</Badge></td>
                      <td className="py-2 pr-3 text-gray-500">{new Date(r.updatedAt).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="outline" disabled={loadMutation.isPending} onClick={() => loadMutation.mutate(r.id)}>Open</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{listOffset + 1}–{Math.min(listOffset + LIST_LIMIT, list.total)} of {list.total}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={listOffset === 0} onClick={() => setListOffset((o) => Math.max(0, o - LIST_LIMIT))}>Prev</Button>
                  <Button size="sm" variant="outline" disabled={listOffset + LIST_LIMIT >= list.total} onClick={() => setListOffset((o) => o + LIST_LIMIT)}>Next</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-bold">Create Draft Achievement</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Input label="Code" disabled={!canManage} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. QA_ACHIEVEMENT_first_win" />
            <Input label="Version" type="number" min={1} disabled={!canManage} value={version} onChange={(e) => setVersion(Number(e.target.value))} />
            <Select label="Rarity" disabled={!canManage} value={rarity} onChange={(e) => setRarity(e.target.value as AchievementMetadata['rarity'])}
              options={RARITIES.map((r) => ({ value: r, label: r }))} />
            <Input label="Target count" disabled={!canManage} value={targetCount} onChange={(e) => setTargetCount(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Title (EN)" disabled={!canManage} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            <Input label="Title (AR, optional)" disabled={!canManage} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </div>
          <Input label="Description (EN, optional)" disabled={!canManage} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" disabled={!canManage} checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)} />
            Hidden until unlocked
          </label>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Criteria</p>
            <div className="space-y-3">
              <NodeSlotPicker label="Trigger *" registry={registry} category="TRIGGER" value={trigger} onChange={canManage ? setTrigger : () => {}} />
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conditions (AND when 2+)</label>
                {canManage && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setConditions((c) => [...c, { type: '', config: {} }])}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add condition
                  </Button>
                )}
              </div>
              {conditions.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <NodeSlotPicker label={`Condition ${i + 1}`} registry={registry} category="CONDITION"
                      value={c.type ? c : null}
                      onChange={(v) => setConditions((prev) => prev.map((p, idx) => (idx === i ? (v ?? { type: '', config: {} }) : p)))} />
                  </div>
                  {canManage && (
                    <button type="button" onClick={() => setConditions((prev) => prev.filter((_, idx) => idx !== i))} className="mt-7 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <NodeSlotPicker label="Counter (optional)" registry={registry} category="COUNTER" value={counter} onChange={setCounter} allowClear />
              <NodeSlotPicker label="Window (optional)" registry={registry} category="WINDOW" value={window} onChange={setWindow} allowClear />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Reward Bundle V2</p>
            <RewardBundleV2Editor value={rewardBundle} onChange={setRewardBundle} disabled={!canManage} />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" onClick={() => createMutation.mutate()} disabled={!canCreate || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Create draft
            </Button>
          </div>
        </CardContent>
      </Card>

      {activeAchievement && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold">
                {activeAchievement.definitionKey} <span className="text-gray-400 font-normal">v{activeAchievement.definitionVersion}</span>
              </CardTitle>
              <Badge variant={STATE_COLOR[activeAchievement.state]}>{activeAchievement.state}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400">id: {activeAchievement.id}</p>
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" disabled={!canManage || activeAchievement.state !== 'DRAFT' || validateMutation.isPending} onClick={() => validateMutation.mutate()}>
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Validate
              </Button>
              <Button size="sm" variant="outline" disabled={!canManage || activeAchievement.state !== 'VALIDATED'} onClick={() => setConfirmAction('publish')}>
                <Play className="w-3.5 h-3.5 mr-1" /> Publish
              </Button>
              <Button size="sm" variant="danger" disabled={!canManage || activeAchievement.state !== 'PUBLISHED'} onClick={() => setConfirmAction('disable')}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Disable
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmAction === 'publish'} onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Publish achievement?" message="It will become PUBLISHED and immutable; players can start unlocking it immediately."
        confirmText="Publish" variant="warning"
        onConfirm={async () => { await publishMutation.mutateAsync(); }}
      />
      <ConfirmDialog
        open={confirmAction === 'disable'} onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Disable achievement?" message="It will stop matching new events." confirmText="Disable" variant="danger"
        onConfirm={async () => { await disableMutation.mutateAsync(); }}
      />
    </div>
  );
}
