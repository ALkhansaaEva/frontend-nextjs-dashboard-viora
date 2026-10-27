'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Plus, AlertTriangle, ArrowLeft, FolderOpen, RefreshCw, Eye, EyeOff, Pencil,
} from 'lucide-react';
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
import { humanizeToken } from '@/shared/lib/labels';
import achievementsService, { type AchievementMetadata } from '@/services/achievements.service';
import { normalizeDefinitionKeyInput, type RuleDefinition, type RuleDefinitionState } from '@/types/rules';

const STATES: RuleDefinitionState[] = ['DRAFT', 'VALIDATED', 'PUBLISHED', 'DISABLED', 'ROLLED_BACK', 'ARCHIVED'];
const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default', VALIDATED: 'warning', PUBLISHED: 'success', DISABLED: 'danger',
  ROLLED_BACK: 'danger', ARCHIVED: 'danger',
};
const RARITIES: NonNullable<AchievementMetadata['rarity']>[] = ['common', 'rare', 'epic', 'legendary'];
const LIST_LIMIT = 20;

function readMetadata(metadata: Record<string, unknown> | undefined): AchievementMetadata {
  const m = (metadata ?? {}) as Partial<AchievementMetadata>;
  return {
    titleI18n: m.titleI18n ?? {},
    descriptionI18n: m.descriptionI18n,
    rarity: m.rarity ?? 'common',
    hidden: m.hidden ?? m.isHidden ?? false,
    isHidden: m.isHidden ?? false,
  };
}

/**
 * Achievements are `RuleDefinition.kind = 'ACHIEVEMENT'` — there is no separate
 * `/admin/achievements` backend domain (verified against rule-admin.controller.ts).
 * This page is a domain-filtered authoring surface over the same Rule Engine
 * that /dashboard/gameplay/rules exposes directly, sharing the identical
 * RuleBuilder (visual graph canvas + Reward Bundle V2 editor + lifecycle
 * actions) that Tasks uses too — see §5/§33/§40 of the migration brief.
 */
export default function AchievementsPage() {
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('achievements.read');
  const canWrite = hasPermission('achievements.write');

  const [stateFilter, setStateFilter] = useState<RuleDefinitionState | ''>('');
  const [keyFilter, setKeyFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<{ id?: string } | null>(null);

  const listQueryKey = ['admin-rules', 'ACHIEVEMENT', stateFilter, keyFilter, offset] as const;
  const { data: list, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: listQueryKey,
    queryFn: () => achievementsService.listAchievements({
      state: stateFilter || undefined,
      definitionKey: keyFilter.trim() || undefined,
      limit: LIST_LIMIT,
      offset,
    }),
    enabled: canRead,
  });

  // Real per-state counts (not a client-side slice of one page) — one bounded
  // GET each, reading `.total` from findAndCount regardless of `limit`.
  const draftStat = useQuery({ queryKey: ['admin-rules', 'ACHIEVEMENT', 'stat', 'DRAFT'], queryFn: () => achievementsService.listAchievements({ state: 'DRAFT', limit: 1 }), enabled: canRead });
  const validatedStat = useQuery({ queryKey: ['admin-rules', 'ACHIEVEMENT', 'stat', 'VALIDATED'], queryFn: () => achievementsService.listAchievements({ state: 'VALIDATED', limit: 1 }), enabled: canRead });
  const publishedStat = useQuery({ queryKey: ['admin-rules', 'ACHIEVEMENT', 'stat', 'PUBLISHED'], queryFn: () => achievementsService.listAchievements({ state: 'PUBLISHED', limit: 1 }), enabled: canRead });
  const disabledStat = useQuery({ queryKey: ['admin-rules', 'ACHIEVEMENT', 'stat', 'DISABLED'], queryFn: () => achievementsService.listAchievements({ state: 'DISABLED', limit: 1 }), enabled: canRead });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-rules', 'ACHIEVEMENT'] });

  if (selected) {
    return (
      <AchievementEditor
        ruleId={selected.id}
        canWrite={canWrite}
        onClose={() => { setSelected(null); invalidate(); }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Achievements"
        description="RuleDefinition (kind: ACHIEVEMENT) — authored, validated, and published through the same Rule Engine as Tasks and Rules."
        icon={<Trophy className="w-5 h-5" />}
        action={canWrite ? { label: 'Create Achievement', onClick: () => setSelected({}), icon: <Plus className="w-4 h-4" /> } : undefined}
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

          <RuleProgressPanel kind="ACHIEVEMENT" />

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
                  <Select value={stateFilter} onChange={(e) => { setStateFilter(e.target.value as RuleDefinitionState | ''); setOffset(0); }}
                    options={[{ value: '', label: 'Active states' }, ...STATES.map((s) => ({ value: s, label: s }))]} />
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
                emptyMessage="No achievements match this filter yet."
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
                          title={meta.titleI18n?.en || r.definitionKey}
                          detailLabel="Rarity"
                          detailValue={humanizeToken(meta.rarity ?? '—')}
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

/** Basic Info + embedded visual RuleBuilder (kind locked to ACHIEVEMENT). */
function AchievementEditor({ ruleId, canWrite, onClose }: { ruleId?: string; canWrite: boolean; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [version, setVersion] = useState(1);
  const [targetCount, setTargetCount] = useState('1');
  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [rarity, setRarity] = useState<NonNullable<AchievementMetadata['rarity']>>('common');
  const [isHidden, setIsHidden] = useState(false);
  const [loadedRule, setLoadedRule] = useState<RuleDefinition | null>(null);
  const [isDraftingNewVersion, setIsDraftingNewVersion] = useState(false);
  const [isBasicInfoOpen, setIsBasicInfoOpen] = useState(!ruleId);

  const isNew = !ruleId;
  // Identity is only editable before the first save — the backend has no
  // in-place update endpoint (POST /admin/rules always inserts a new
  // (definitionKey, definitionVersion) row), so once a rule exists its
  // identity is fixed and further edits go through "New version" instead.
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
            {code || 'New achievement'} · v{version} · target {targetCount} · {humanizeToken(rarity)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setIsBasicInfoOpen(true)}>
          <Pencil className="h-4 w-4" /> {canEditBasicInfo ? 'Edit basic info' : 'View basic info'}
        </Button>
      </div>
      {loadedRule && loadedRule.state !== 'DRAFT' && (
        <p className="text-xs text-amber-700 dark:text-amber-300">This version is immutable. Use <strong>New version</strong> in the toolbar to edit its graph, rewards, artwork, or basic info.</p>
      )}

      <Modal isOpen={isBasicInfoOpen} onClose={() => setIsBasicInfoOpen(false)} title="Achievement basic info" size="xl">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <Input label="Definition key" disabled={!canEditBasicInfo || identityLocked} value={code}
              onChange={(e) => setCode(normalizeDefinitionKeyInput(e.target.value))} placeholder="achievement_first_win" className="font-mono" />
            <Input label="Version" type="number" min={1} disabled={!canEditBasicInfo || identityLocked} value={version}
              onChange={(e) => setVersion(Number(e.target.value) || 1)} />
            <Select label="Rarity" disabled={!canEditBasicInfo} value={rarity}
              onChange={(e) => setRarity(e.target.value as typeof rarity)}
              options={RARITIES.map((r) => ({ value: r, label: r }))} />
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
            bucket="achievements"
            purpose="achievement-artwork"
            disabled={!canEditBasicInfo}
          />
          <button type="button" disabled={!canEditBasicInfo} onClick={() => setIsHidden((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-60">
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isHidden ? 'Hidden until unlocked' : 'Visible before unlock'}
          </button>
          <div className="flex justify-end border-t border-gray-200 pt-3 dark:border-gray-700">
            <Button size="sm" onClick={() => setIsBasicInfoOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>

      <RuleBuilder
        ruleId={ruleId}
        lockKind="ACHIEVEMENT"
        hideIdentity
        identity={{ definitionKey: code, definitionVersion: version, targetCount }}
        readOnly={!canWrite}
        mediaId={mediaId}
        extraMetadata={{
          titleI18n: { en: titleEn, ...(titleAr ? { ar: titleAr } : {}) },
          descriptionI18n: descriptionEn ? { en: descriptionEn } : undefined,
          rarity, hidden: isHidden,
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
          setRarity(meta.rarity ?? 'common');
          setIsHidden(Boolean(meta.hidden ?? meta.isHidden));
        }}
      />
    </div>
  );
}
