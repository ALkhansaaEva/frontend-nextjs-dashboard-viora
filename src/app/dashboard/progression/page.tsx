'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, ShieldCheck, Save, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState } from '@/shared/components/ui/QueryState';
import { ProgressionTimeline } from '@/shared/components/ui/ProgressionTimeline';
import { RewardBundleV2Editor } from '@/shared/components/rewards/RewardBundleV2Editor';
import { useHasPermission } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/hooks/useAuth';
import { useToast } from '@/store/toast.store';
import progressionPolicyService, {
  roomLevelPolicyService,
  levelConfigService,
  type ProgressionPolicyType,
  type RoomLevelConfigRow,
} from '@/services/progression.service';
import progressionTracksService from '@/services/progression-tracks.service';
import {
  isRewardBundleV2Shape,
  type RewardBundleV2,
} from '@/types/rules';
import { humanizeToken } from '@/shared/lib/labels';

const TABS = [
  { id: 'player', label: 'Player Levels' },
  { id: 'room', label: 'Room Levels' },
  { id: 'chat', label: 'Chat Contribution' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'policies', label: 'Policies' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function bundleOf(value: unknown): RewardBundleV2 | null {
  return isRewardBundleV2Shape(value) ? (value as RewardBundleV2) : null;
}

/* ────────────────────────── Player Levels ────────────────────────── */

function PlayerLevelsTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, { xpRequired: number; rewardBundle: RewardBundleV2 | null }> | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['level-config'],
    queryFn: () => levelConfigService.list(),
  });
  const levels = data?.levels;

  const active = useMemo(() => {
    const rows = levels ?? [];
    if (!edits) return rows;
    return rows.map((row) => ({
      ...row,
      xpRequired: edits[row.level]?.xpRequired ?? row.xpRequired,
      rewardBundle: edits[row.level]?.rewardBundle ?? bundleOf(row.rewardBundle),
    }));
  }, [levels, edits]);

  const selectedRow = active.find((row) => row.level === selected) ?? null;

  const startEdit = () => {
    if (!levels) return;
    setEdits(
      Object.fromEntries(
        levels.map((row) => [
          row.level,
          { xpRequired: row.xpRequired, rewardBundle: bundleOf(row.rewardBundle) },
        ]),
      ),
    );
    setReason('');
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      levelConfigService.replace(
        active.map((row) => ({
          level: row.level,
          xpRequired: row.xpRequired,
          rewardBundle: row.rewardBundle,
        })),
        reason,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['level-config'] });
      const readback = await levelConfigService.list();
      queryClient.setQueryData(['level-config'], readback);
      setEdits(null);
      toast.success('Player level config saved and read back from server.');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save player level config.'),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 sm:flex-row sm:items-center sm:justify-between dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
        <p>
          Room levels control XP, mic slots, and seat limits. The live member admission ceiling is a separate
          runtime setting and does not change the level timeline.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center gap-1 font-semibold text-sky-700 hover:underline dark:text-sky-300"
        >
          Room capacity setting <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <Card padding="none">
      <CardHeader className="flex-row items-center justify-between p-4 pb-0">
        <CardTitle className="text-sm font-bold">
          Player Levels{' '}
          {data && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              cap L{data.maxLevel} (USER_LEVEL policy)
            </span>
          )}
        </CardTitle>
        {canWrite && !edits && levels && levels.length > 0 && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!levels || levels.length === 0}
          emptyMessage="No player level configuration yet. Levels use bootstrap thresholds until configured."
          onRetry={() => refetch()}
        >
          <ProgressionTimeline
            milestones={active.map((row) => ({
              level: row.level,
              threshold: String(row.xpRequired),
              hasReward: !!row.rewardBundle,
            }))}
            selectedLevel={selected}
            onSelect={setSelected}
            maxLevel={data?.maxLevel}
          />
          {selectedRow && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Level {selectedRow.level}</h4>
                <Badge variant="default">
                  {String(selectedRow.xpRequired)} XP required
                </Badge>
              </div>
              {edits ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-500">
                    XP required (cumulative)
                    <Input
                      type="number"
                      className="mt-1"
                      value={edits[selectedRow.level]?.xpRequired ?? selectedRow.xpRequired}
                      onChange={(e) =>
                        setEdits((prev) =>
                          prev
                            ? {
                                ...prev,
                                [selectedRow.level]: {
                                  ...(prev[selectedRow.level] ?? {
                                    xpRequired: selectedRow.xpRequired,
                                    rewardBundle: bundleOf(selectedRow.rewardBundle),
                                  }),
                                  xpRequired: parseInt(e.target.value, 10) || 0,
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  </label>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      Reward (RewardBundleV2 — canonical)
                    </p>
                    <RewardBundleV2Editor
                      value={edits[selectedRow.level]?.rewardBundle ?? null}
                      onChange={(bundle) =>
                        setEdits((prev) =>
                          prev
                            ? {
                                ...prev,
                                [selectedRow.level]: {
                                  ...(prev[selectedRow.level] ?? {
                                    xpRequired: selectedRow.xpRequired,
                                    rewardBundle: null,
                                  }),
                                  rewardBundle: bundle,
                                },
                              }
                            : prev,
                        )
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {selectedRow.rewardBundle ? (
                    <p>
                      Reward bundle:{' '}
                      {(selectedRow.rewardBundle as RewardBundleV2).components.length}{' '}
                      component(s)
                    </p>
                  ) : (
                    <p>No reward configured for this level.</p>
                  )}
                </div>
              )}
            </div>
          )}
          {edits && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <Input
                placeholder="Change reason (required, audited)"
                className="max-w-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!reason.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="mr-1 h-3.5 w-3.5" /> Save all levels
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEdits(null)}>
                Cancel
              </Button>
            </div>
          )}
        </QueryState>
      </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────────────── Room Levels ─────────────────────────── */

function RoomLevelsTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, RoomLevelConfigRow> | null>(null);
  const [reason, setReason] = useState('');

  const { data: levels, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['room-level-policy'],
    queryFn: () => roomLevelPolicyService.list(),
  });
  const { data: roomPolicies } = useQuery({
    queryKey: ['progression-policy', 'ROOM_LEVEL'],
    queryFn: () => progressionPolicyService.list('ROOM_LEVEL'),
  });
  const activeCap = roomPolicies?.find((p) => p.status === 'active')?.maxLevel;

  const active = useMemo(() => {
    const rows = levels ?? [];
    if (!edits) return rows;
    return rows.map((row) => edits[row.level] ?? row);
  }, [levels, edits]);

  const selectedRow = active.find((row) => row.level === selected) ?? null;

  const startEdit = () => {
    if (!levels) return;
    setEdits(Object.fromEntries(levels.map((row) => [row.level, { ...row }])));
    setReason('');
  };

  const updateField = <K extends keyof RoomLevelConfigRow>(
    level: number,
    field: K,
    value: RoomLevelConfigRow[K],
  ) =>
    setEdits((prev) =>
      prev && prev[level] ? { ...prev, [level]: { ...prev[level], [field]: value } } : prev,
    );

  const saveMutation = useMutation({
    mutationFn: () =>
      roomLevelPolicyService.replace(
        active.map((row) => ({
          level: row.level,
          xpRequired: row.xpRequired,
          micSlots: row.micSlots,
          defaultSeatCount: row.defaultSeatCount,
          maxSeatCount: row.maxSeatCount,
          featureFlags: row.featureFlags,
          themeUnlocks: row.themeUnlocks,
          rewardBundle: bundleOf(row.rewardBundle),
          expectedVersion: row.version,
          reason,
        })),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['room-level-policy'] });
      const readback = await roomLevelPolicyService.list();
      queryClient.setQueryData(['room-level-policy'], readback);
      setEdits(null);
      toast.success('Room level policy saved and read back from server.');
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Failed to save room level policy.'),
  });

  return (
    <Card padding="none">
      <CardHeader className="flex-row items-center justify-between p-4 pb-0">
        <CardTitle className="text-sm font-bold">
          Room Levels{' '}
          {activeCap && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              cap L{activeCap} (ROOM_LEVEL policy)
            </span>
          )}
        </CardTitle>
        {canWrite && !edits && levels && levels.length > 0 && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!levels || levels.length === 0}
          emptyMessage="No room level configuration yet."
          onRetry={() => refetch()}
        >
          <ProgressionTimeline
            milestones={active.map((row) => ({
              level: row.level,
              threshold: String(row.xpRequired),
              hasReward: !!row.rewardBundle,
              detail: `${row.micSlots} mics · ${row.defaultSeatCount}-${row.maxSeatCount} seats`,
            }))}
            selectedLevel={selected}
            onSelect={setSelected}
            maxLevel={activeCap}
          />
          {selectedRow && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Room Level {selectedRow.level}</h4>
                <Badge variant="default">v{selectedRow.version}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {(
                  [
                    ['xpRequired', 'XP required'],
                    ['micSlots', 'Mic slots'],
                    ['defaultSeatCount', 'Default seats'],
                    ['maxSeatCount', 'Max seats'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block text-xs font-medium text-gray-500">
                    {label}
                    {edits ? (
                      <Input
                        type="number"
                        className="mt-1"
                        value={selectedRow[field] as number}
                        onChange={(e) =>
                          updateField(selectedRow.level, field, parseInt(e.target.value, 10) || 0)
                        }
                      />
                    ) : (
                      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {selectedRow[field] as number}
                      </p>
                    )}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500">Theme unlocks</p>
                {edits ? (
                  <Input
                    className="mt-1"
                    value={(selectedRow.themeUnlocks ?? []).join(', ')}
                    onChange={(e) =>
                      updateField(
                        selectedRow.level,
                        'themeUnlocks',
                        e.target.value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                    {(selectedRow.themeUnlocks ?? []).join(', ') || '—'}
                  </p>
                )}
              </div>
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Level reward (RewardBundleV2 — canonical)
                </p>
                {edits ? (
                  <RewardBundleV2Editor
                    value={bundleOf(selectedRow.rewardBundle)}
                    onChange={(bundle) => updateField(selectedRow.level, 'rewardBundle', bundle)}
                  />
                ) : selectedRow.rewardBundle ? (
                  <p className="text-sm text-gray-700 dark:text-gray-200">
                    {(selectedRow.rewardBundle as RewardBundleV2).components.length} component(s)
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No reward configured.</p>
                )}
              </div>
            </div>
          )}
          {edits && (
            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
              <Input
                placeholder="Change reason (required, audited)"
                className="max-w-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button
                size="sm"
                disabled={!reason.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                <Save className="mr-1 h-3.5 w-3.5" /> Save all levels
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEdits(null)}>
                Cancel
              </Button>
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────── Chat Contribution ─────────────────────── */

function ChatContributionTab() {
  const [selected, setSelected] = useState<number | null>(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-tracks', 'CHAT_CONTRIBUTION_LEVEL', 'PUBLISHED'],
    queryFn: () =>
      progressionTracksService.list({
        trackType: 'CHAT_CONTRIBUTION_LEVEL',
        status: 'PUBLISHED',
        limit: 50,
      }),
  });
  const published = data?.items ?? [];
  const latest = published[0];

  const detailQuery = useQuery({
    queryKey: ['progression-track', latest?.id],
    queryFn: () => progressionTracksService.getById(latest!.id),
    enabled: !!latest,
  });
  const track = detailQuery.data ?? null;

  const thresholds = (track?.thresholds ?? []) as Array<{
    level: number;
    requiredXp: string;
    rewardBundle?: unknown;
  }>;
  const selectedThreshold = thresholds.find((row) => row.level === selected) ?? null;

  return (
    <Card padding="none">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm font-bold">
          Chat Contribution Levels{' '}
          <span className="ml-2 text-xs font-normal text-gray-400">
            track key CHAT_CONTRIBUTION_LEVEL (generic progression track)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading || (latest ? detailQuery.isLoading : false)}
          isError={isError || detailQuery.isError}
          error={detailQuery.error ?? error}
          isEmpty={!latest}
          emptyMessage="No published CHAT_CONTRIBUTION_LEVEL track — chat levels are safely inert until one is published."
          onRetry={() => refetch()}
        >
          {track && (
            <>
              <ProgressionTimeline
                milestones={thresholds.map((row) => ({
                  level: row.level,
                  threshold: row.requiredXp,
                  hasReward: !!row.rewardBundle,
                }))}
                selectedLevel={selected}
                onSelect={setSelected}
                thresholdLabel="chars"
              />
              {selectedThreshold && (
                <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">
                      Level {selectedThreshold.level} — {selectedThreshold.requiredXp} accepted
                      characters
                    </h4>
                    <Badge variant="default">v{track.version}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedThreshold.rewardBundle
                      ? `Reward bundle: ${(selectedThreshold.rewardBundle as RewardBundleV2).components.length} component(s)`
                      : 'No reward configured.'}
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    Threshold and reward authoring lives in the canonical track editor.
                  </p>
                  <Link
                    href="/dashboard/progression-tracks"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Open Progression Tracks <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Tracks summary ─────────────────────────── */

function TracksSummaryTab() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-tracks', 'summary'],
    queryFn: () => progressionTracksService.list({ limit: 100 }),
  });
  const items = data?.items ?? [];
  return (
    <Card padding="none">
      <CardHeader className="flex-row items-center justify-between p-4 pb-0">
        <CardTitle className="text-sm font-bold">Progression Tracks</CardTitle>
        <Link
          href="/dashboard/progression-tracks"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Open full catalog & editor <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={items.length === 0}
          emptyMessage="No progression tracks yet."
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-3">Track key</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Levels</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-3">
                      <p className="text-xs font-medium">{humanizeToken(item.trackKey)}</p>
                      <p className="font-mono text-[10px] text-gray-400">{item.trackKey}</p>
                    </td>
                    <td className="py-2 pr-3 text-xs">{humanizeToken(item.trackType)}</td>
                    <td className="py-2 pr-3">v{item.version}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={
                          item.status === 'PUBLISHED'
                            ? 'success'
                            : item.status === 'DRAFT'
                              ? 'default'
                              : 'danger'
                        }
                      >
                        {humanizeToken(item.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">{item.thresholdCount}</td>
                    <td className="py-2 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Policies ─────────────────────────── */

const POLICY_TYPES: Array<{ value: ProgressionPolicyType; label: string }> = [
  { value: 'USER_LEVEL', label: 'USER_LEVEL (player cap)' },
  { value: 'ROOM_LEVEL', label: 'ROOM_LEVEL (room cap)' },
  { value: 'CHAT_LEVEL', label: 'CHAT_LEVEL (chat cap)' },
];

function PoliciesTab({ canWrite }: { canWrite: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [policyType, setPolicyType] = useState<ProgressionPolicyType>('USER_LEVEL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ maxLevel: 100, version: 1, effectiveFrom: '', changeReason: '' });

  const { data: policies, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-policy', policyType],
    queryFn: () => progressionPolicyService.list(policyType),
  });
  const activePolicy = policies?.find((p) => p.status === 'active');

  const openCreate = () => {
    const nextVersion = Math.max(0, ...(policies ?? []).map((policy) => policy.version)) + 1;
    const reflectedMaxLevel = activePolicy?.maxLevel ?? policies?.[0]?.maxLevel ?? 100;
    setForm({
      maxLevel: reflectedMaxLevel,
      version: nextVersion,
      effectiveFrom: '',
      changeReason: '',
    });
    setShowCreate(true);
  };

  const createFormValid =
    Number.isInteger(form.maxLevel) &&
    form.maxLevel >= 1 &&
    form.maxLevel <= 1000 &&
    Number.isInteger(form.version) &&
    form.version > 0 &&
    !policies?.some((policy) => policy.version === form.version) &&
    Boolean(form.changeReason.trim());

  const createMutation = useMutation({
    mutationFn: () =>
      progressionPolicyService.createDraft({
        policyType,
        maxLevel: form.maxLevel,
        version: form.version,
        effectiveFrom: form.effectiveFrom || new Date().toISOString(),
        changeReason: form.changeReason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progression-policy', policyType] });
      setShowCreate(false);
      toast.success('Draft policy created.');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to create draft.'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => progressionPolicyService.activate(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['progression-policy', policyType] });
      toast.success(
        result.duplicate
          ? 'Policy v' + result.policy.version + ' was already the active version.'
          : 'Policy version activated.',
      );
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to activate.'),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={policyType}
          onChange={(e) => setPolicyType(e.target.value as ProgressionPolicyType)}
          options={POLICY_TYPES}
          className="w-64"
        />
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" /> New draft version
          </Button>
        )}
      </div>
      {activePolicy && (
        <p className="text-xs text-gray-500">
          Active cap: <span className="font-semibold">L{activePolicy.maxLevel}</span> (policy v
          {activePolicy.version})
        </p>
      )}
      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <CardTitle className="text-sm font-bold">Policy versions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <QueryState
            isLoading={isLoading}
            isError={isError}
            error={error}
            isEmpty={!policies || policies.length === 0}
            emptyMessage="No policy versions for this track yet."
            onRetry={() => refetch()}
          >
            <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Max level</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Effective from</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(policies ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-3">{p.version}</td>
                    <td className="py-2 pr-3 font-semibold">{p.maxLevel}</td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={
                          p.status === 'active' ? 'success' : p.status === 'draft' ? 'default' : 'danger'
                        }
                      >
                        {humanizeToken(p.status)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">
                      {new Date(p.effectiveFrom).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      {p.status === 'draft' && canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={activateMutation.isPending}
                          onClick={() => activateMutation.mutate(p.id)}
                          title={
                            p.createdBy === currentUser?.id
                              ? 'You created this draft. Activating it is recorded as a self-approval.'
                              : undefined
                          }
                        >
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Activate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      {showCreate && (
        <Modal isOpen title={`New ${policyType} draft`} onClose={() => setShowCreate(false)}>
          <div className="space-y-3">
            <label className="block text-xs font-medium text-gray-500">
              Max level (1–1000)
              <Input
                type="number"
                min={1}
                max={1000}
                className="mt-1"
                value={form.maxLevel}
                onChange={(e) => setForm({ ...form, maxLevel: parseInt(e.target.value, 10) || 0 })}
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              Version
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: parseInt(e.target.value, 10) || 0 })}
              />
            </label>
            <label className="block text-xs font-medium text-gray-500">
              Change reason (required)
              <Input
                className="mt-1"
                value={form.changeReason}
                onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!createFormValid || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create draft
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────── Page shell ─────────────────────────── */

export default function ProgressionPage() {
  const hasPermission = useHasPermission();
  // Every read on this page (level config, room level policy, progression
  // policies, track summaries) is guarded by admin.read server-side — without
  // this gate the page fires a burst of 403s for operators who only write.
  const canRead = hasPermission('admin.read');
  const canWrite = hasPermission('configs.write');
  const [tab, setTab] = useState<TabId>('player');

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have <code>admin.read</code> — this page is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progression"
        description="Level timelines, thresholds and rewards. Policies own max-level caps; tracks own milestone thresholds; the Rule Engine owns event logic."
        icon={<TrendingUp className="h-6 w-6 text-indigo-500" />}
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Progression areas">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'player' && <PlayerLevelsTab canWrite={canWrite} />}
      {tab === 'room' && <RoomLevelsTab canWrite={canWrite} />}
      {tab === 'chat' && <ChatContributionTab />}
      {tab === 'tracks' && <TracksSummaryTab />}
      {tab === 'policies' && <PoliciesTab canWrite={canWrite} />}
      <p className="text-xs text-gray-400">
        ROOM_MEMBER_LEVEL is system-managed (formula-based, max 100) and GAME_LEVEL is reserved —
        neither has an Admin-authorable runtime today.
      </p>
    </div>
  );
}
