'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, ShieldCheck, Save } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState, asApiError } from '@/shared/components/ui/QueryState';
import { ProgressionTimeline } from '@/shared/components/ui/ProgressionTimeline';
import { RewardBundleV2Editor } from '@/shared/components/rewards/RewardBundleV2Editor';
import { useHasPermission } from '@/hooks/usePermissions';
import { useCurrentUser } from '@/hooks/useAuth';
import { useToast } from '@/store/toast.store';
import progressionPolicyService, {
  roomLevelPolicyService,
  levelConfigService,
  type ProgressionPolicyLimits,
  type ProgressionPolicyType,
  type RoomLevelConfigRow,
  type RoomMicCapacityRow,
} from '@/services/progression.service';
import {
  isRewardBundleV2Shape,
  type RewardBundleV2,
} from '@/types/rules';
import { humanizeToken } from '@/shared/lib/labels';

const TABS = [
  { id: 'player', label: 'Player Levels' },
  { id: 'room', label: 'Room Levels' },
  { id: 'policies', label: 'Policies' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function bundleOf(value: unknown): RewardBundleV2 | null {
  return isRewardBundleV2Shape(value) ? (value as RewardBundleV2) : null;
}

/** Strict whole-number parser: empty input and trailing garbage are invalid,
 * never silently coerced to 0. */
function parseWholeNumber(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

function policyCapText(
  policies: undefined | Array<{ status: string; version: number; maxLevel: number }>,
  isError: boolean,
  defaultLevel: number,
): ReactNode {
  if (isError) return 'Effective cap unavailable — the policy read failed.';
  if (policies === undefined) return 'Loading effective cap…';
  const active = policies.find((policy) => policy.status === 'active');
  if (active) {
    return (
      <>
        policy v{active.version} = <span className="font-semibold">L{active.maxLevel}</span>
      </>
    );
  }
  return (
    <>
      no active policy — compiled default <span className="font-semibold">L{defaultLevel}</span> applies
    </>
  );
}

/* ────────────────────────── Player Levels ────────────────────────── */

type PlayerLevelEdit = { xpRequired: string; rewardBundle: RewardBundleV2 | null };

function PlayerLevelsTab({ canWrite, limits }: { canWrite: boolean; limits: ProgressionPolicyLimits }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, PlayerLevelEdit> | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['level-config'],
    queryFn: () => levelConfigService.list(),
  });
  const levels = data?.levels;

  const {
    data: policies,
    isError: policiesError,
  } = useQuery({
    queryKey: ['progression-policy', 'USER_LEVEL'],
    queryFn: () => progressionPolicyService.list('USER_LEVEL'),
  });

  const active = useMemo(() => {
    const rows = levels ?? [];
    return rows.map((row) => {
      const edit = edits?.[row.level];
      return {
        ...row,
        xpRequired: edit ? edit.xpRequired : String(row.xpRequired),
        rewardBundle: edit ? edit.rewardBundle : bundleOf(row.rewardBundle),
      };
    });
  }, [levels, edits]);

  const xpError = useMemo(() => {
    if (!edits) return null;
    for (const [level, edit] of Object.entries(edits)) {
      if (!/^\d+$/.test(edit.xpRequired)) {
        return `Level ${level}: XP required must be a non-negative whole number.`;
      }
    }
    return null;
  }, [edits]);

  const selectedRow = active.find((row) => row.level === selected) ?? null;

  const startEdit = () => {
    if (!levels) return;
    setEdits(
      Object.fromEntries(
        levels.map((row) => [
          row.level,
          { xpRequired: String(row.xpRequired), rewardBundle: bundleOf(row.rewardBundle) },
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
          xpRequired: Number(row.xpRequired),
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
      toast.error(asApiError(err).message ?? 'Failed to save player level config.'),
  });

  return (
    <Card padding="none">
      <CardHeader className="p-4 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Effective cap: {policyCapText(policies, policiesError, limits.defaults.USER_LEVEL)}
        </p>
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
              threshold: row.xpRequired,
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
                  {selectedRow.xpRequired} XP required
                </Badge>
              </div>
              {edits ? (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-gray-500">
                    XP required (cumulative)
                    <Input
                      type="number"
                      min={0}
                      className="mt-1"
                      value={edits[selectedRow.level]?.xpRequired ?? selectedRow.xpRequired}
                      onChange={(e) =>
                        setEdits((prev) => {
                          if (!prev) return prev;
                          const current = prev[selectedRow.level] ?? {
                            xpRequired: selectedRow.xpRequired,
                            rewardBundle: bundleOf(selectedRow.rewardBundle),
                          };
                          return {
                            ...prev,
                            [selectedRow.level]: { ...current, xpRequired: e.target.value },
                          };
                        })
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
                        setEdits((prev) => {
                          if (!prev) return prev;
                          const current = prev[selectedRow.level] ?? {
                            xpRequired: selectedRow.xpRequired,
                            rewardBundle: null,
                          };
                          return {
                            ...prev,
                            [selectedRow.level]: { ...current, rewardBundle: bundle },
                          };
                        })
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
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Change reason (required, audited)"
                  className="max-w-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!reason.trim() || !!xpError || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  <Save className="mr-1 h-3.5 w-3.5" /> Save all levels
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEdits(null)}>
                  Cancel
                </Button>
              </div>
              {xpError && <p className="text-xs text-red-600 dark:text-red-400">{xpError}</p>}
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

/* ─────────────────────────── Room Levels ─────────────────────────── */

type RoomLevelDraft = {
  level: number;
  xpRequired: string;
  micSlots: string;
  defaultSeatCount: string;
  maxSeatCount: string;
  featureFlags: Record<string, boolean>;
  themeUnlocks: string[];
  version: number;
  rewardBundle: RewardBundleV2 | null;
};

function roomDraftOf(row: RoomLevelConfigRow): RoomLevelDraft {
  return {
    level: row.level,
    xpRequired: String(row.xpRequired),
    micSlots: String(row.micSlots),
    defaultSeatCount: String(row.defaultSeatCount),
    maxSeatCount: String(row.maxSeatCount),
    featureFlags: row.featureFlags,
    themeUnlocks: row.themeUnlocks,
    version: row.version,
    rewardBundle: bundleOf(row.rewardBundle),
  };
}

function MicCapacityPanel() {
  const { data: rows, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['room-level-policy', 'mic-capacity'],
    queryFn: () => roomLevelPolicyService.micCapacity(),
  });
  const list = rows ?? [];

  return (
    <Card padding="none">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm font-bold">Microphone capacity compliance</CardTitle>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Capacity reductions never evict occupants; over-capacity rooms converge as members leave.
        </p>
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={list.length === 0}
          emptyMessage="All active rooms are within their microphone capacity."
          onRetry={() => refetch()}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-3">Room</th>
                  <th className="py-2 pr-3">Level</th>
                  <th className="py-2 pr-3">Capacity</th>
                  <th className="py-2 pr-3">Materialized</th>
                  <th className="py-2 pr-3">Occupied</th>
                  <th className="py-2 pr-3">Surplus slots</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {list.map((row: RoomMicCapacityRow) => (
                  <tr key={row.roomId}>
                    <td className="py-2 pr-3">
                      <p className="text-xs font-medium">
                        {row.name?.en || row.name?.ar || row.roomId}
                      </p>
                      <p className="font-mono text-[10px] text-gray-400">{row.roomId}</p>
                    </td>
                    <td className="py-2 pr-3">L{row.level}</td>
                    <td className="py-2 pr-3">{row.capacity}</td>
                    <td className="py-2 pr-3">{row.materializedSlots}</td>
                    <td className="py-2 pr-3">{row.occupiedSlots}</td>
                    <td className="py-2 pr-3">{row.surplusSlots}</td>
                    <td className="py-2">
                      {row.occupiedOverCapacity ? (
                        <Badge variant="danger">Occupied over capacity</Badge>
                      ) : (
                        <Badge variant="warning">Surplus slots</Badge>
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
  );
}

function RoomLevelsTab({ canWrite, limits }: { canWrite: boolean; limits: ProgressionPolicyLimits }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<Record<number, RoomLevelDraft> | null>(null);
  const [reason, setReason] = useState('');

  const { data: levels, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['room-level-policy'],
    queryFn: () => roomLevelPolicyService.list(),
  });
  const { data: roomPolicies, isError: roomPoliciesError } = useQuery({
    queryKey: ['progression-policy', 'ROOM_LEVEL'],
    queryFn: () => progressionPolicyService.list('ROOM_LEVEL'),
  });
  const activePolicy = roomPolicies?.find((policy) => policy.status === 'active');

  const active = useMemo(
    () => (levels ?? []).map((row) => edits?.[row.level] ?? roomDraftOf(row)),
    [levels, edits],
  );

  const draftError = useMemo(() => {
    if (!edits) return null;
    for (const row of Object.values(edits)) {
      const numericFields: Array<[string, string]> = [
        ['XP required', row.xpRequired],
        ['Mic slots', row.micSlots],
        ['Default seats', row.defaultSeatCount],
        ['Max seats', row.maxSeatCount],
      ];
      for (const [label, raw] of numericFields) {
        if (parseWholeNumber(raw) === null) {
          return `Level ${row.level}: ${label} must be a non-negative whole number.`;
        }
      }
      const micSlots = Number(row.micSlots);
      const maxSeats = Number(row.maxSeatCount);
      if (micSlots < 1) return `Level ${row.level}: mic slots must be at least 1.`;
      if (maxSeats < 1) return `Level ${row.level}: max seats must be at least 1.`;
      if (Number(row.defaultSeatCount) < 1) {
        return `Level ${row.level}: default seats must be at least 1.`;
      }
      if (micSlots > maxSeats) {
        return `Level ${row.level}: mic slots cannot exceed max seats (${maxSeats}).`;
      }
      if (maxSeats > limits.roomMic.maxSlots) {
        return `Level ${row.level}: max seats cannot exceed ${limits.roomMic.maxSlots}.`;
      }
      if (Number(row.defaultSeatCount) > maxSeats) {
        return `Level ${row.level}: default seats cannot exceed max seats.`;
      }
    }
    return null;
  }, [edits, limits.roomMic.maxSlots]);

  const selectedRow = active.find((row) => row.level === selected) ?? null;

  const startEdit = () => {
    if (!levels) return;
    setEdits(Object.fromEntries(levels.map((row) => [row.level, roomDraftOf(row)])));
    setReason('');
  };

  const updateField = <K extends keyof RoomLevelDraft>(
    level: number,
    field: K,
    value: RoomLevelDraft[K],
  ) =>
    setEdits((prev) =>
      prev && prev[level] ? { ...prev, [level]: { ...prev[level], [field]: value } } : prev,
    );

  const saveMutation = useMutation({
    mutationFn: () =>
      roomLevelPolicyService.replace(
        active.map((row) => ({
          level: row.level,
          xpRequired: Number(row.xpRequired),
          micSlots: Number(row.micSlots),
          defaultSeatCount: Number(row.defaultSeatCount),
          maxSeatCount: Number(row.maxSeatCount),
          featureFlags: row.featureFlags,
          themeUnlocks: row.themeUnlocks,
          rewardBundle: row.rewardBundle,
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
      toast.error(asApiError(err).message ?? 'Failed to save room level policy.'),
  });

  const numericFields = [
    ['xpRequired', 'XP required'],
    ['micSlots', 'Mic slots'],
    ['defaultSeatCount', 'Default seats'],
    ['maxSeatCount', 'Max seats'],
  ] as const;

  return (
    <div className="space-y-4">
      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold">
              Room Levels{' '}
              {activePolicy && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  cap L{activePolicy.maxLevel} (ROOM_LEVEL policy)
                </span>
              )}
            </CardTitle>
            {canWrite && !edits && levels && levels.length > 0 && (
              <Button size="sm" variant="outline" onClick={startEdit}>
                Edit
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Effective cap: {policyCapText(roomPolicies, roomPoliciesError, limits.defaults.ROOM_LEVEL)}
          </p>
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
                threshold: row.xpRequired,
                hasReward: !!row.rewardBundle,
                detail: `${row.micSlots} mics · ${row.defaultSeatCount}-${row.maxSeatCount} seats`,
              }))}
              selectedLevel={selected}
              onSelect={setSelected}
              maxLevel={activePolicy?.maxLevel}
            />
            {selectedRow && (
              <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Room Level {selectedRow.level}</h4>
                  <Badge variant="default">v{selectedRow.version}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {numericFields.map(([field, label]) => (
                    <label key={field} className="block text-xs font-medium text-gray-500">
                      {label}
                      {edits ? (
                        <>
                          <Input
                            type="number"
                            min={field === 'xpRequired' ? 0 : 1}
                            max={field === 'xpRequired' ? undefined : limits.roomMic.maxSlots}
                            className="mt-1"
                            value={selectedRow[field]}
                            onChange={(e) =>
                              updateField(selectedRow.level, field, e.target.value)
                            }
                          />
                          {field === 'micSlots' && (
                            <span className="mt-1 block text-[11px] font-normal text-gray-400">
                              Default {limits.roomMic.defaultSlots} · technical ceiling{' '}
                              {limits.roomMic.maxSlots} · limited by max seats
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                          {selectedRow[field]}
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
                      value={selectedRow.rewardBundle}
                      onChange={(bundle) => updateField(selectedRow.level, 'rewardBundle', bundle)}
                    />
                  ) : selectedRow.rewardBundle ? (
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {selectedRow.rewardBundle.components.length} component(s)
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">No reward configured.</p>
                  )}
                </div>
              </div>
            )}
            {edits && (
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    placeholder="Change reason (required, audited)"
                    className="max-w-sm"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!reason.trim() || !!draftError || saveMutation.isPending}
                    onClick={() => saveMutation.mutate()}
                  >
                    <Save className="mr-1 h-3.5 w-3.5" /> Save all levels
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEdits(null)}>
                    Cancel
                  </Button>
                </div>
                {draftError && <p className="text-xs text-red-600 dark:text-red-400">{draftError}</p>}
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>
      <MicCapacityPanel />
    </div>
  );
}

/* ─────────────────────────── Policies ─────────────────────────── */

const POLICY_TYPES: Array<{ value: ProgressionPolicyType; label: string }> = [
  { value: 'USER_LEVEL', label: 'USER_LEVEL (player cap)' },
  { value: 'ROOM_LEVEL', label: 'ROOM_LEVEL (room cap)' },
  { value: 'CHAT_LEVEL', label: 'CHAT_LEVEL (chat cap)' },
];

function PoliciesTab({ canWrite, limits }: { canWrite: boolean; limits: ProgressionPolicyLimits }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const [policyType, setPolicyType] = useState<ProgressionPolicyType>('USER_LEVEL');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    maxLevel: '',
    version: '',
    effectiveFrom: '',
    changeReason: '',
  });

  const { data: policies, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-policy', policyType],
    queryFn: () => progressionPolicyService.list(policyType),
  });
  const activePolicy = policies?.find((p) => p.status === 'active');

  const openCreate = () => {
    const nextVersion = Math.max(0, ...(policies ?? []).map((policy) => policy.version)) + 1;
    const reflectedMaxLevel =
      activePolicy?.maxLevel ?? policies?.[0]?.maxLevel ?? limits.defaults[policyType];
    setForm({
      maxLevel: String(reflectedMaxLevel),
      version: String(nextVersion),
      effectiveFrom: '',
      changeReason: '',
    });
    setShowCreate(true);
  };

  const parsedMaxLevel = parseWholeNumber(form.maxLevel);
  const parsedVersion = parseWholeNumber(form.version);
  const maxLevelError =
    parsedMaxLevel === null
      ? 'Enter a whole number.'
      : parsedMaxLevel < 1 || parsedMaxLevel > limits.supportedMaxLevel
        ? `Must be between 1 and ${limits.supportedMaxLevel}.`
        : null;
  const versionError =
    parsedVersion === null
      ? 'Enter a whole number.'
      : parsedVersion < 1
        ? 'Must be at least 1.'
        : policies?.some((policy) => policy.version === parsedVersion)
          ? `Version ${parsedVersion} already exists.`
          : null;
  const reasonError =
    form.changeReason.trim().length >= 3 ? null : 'At least 3 characters are required.';

  const createFormValid = !maxLevelError && !versionError && !reasonError;

  const readBack = async () => {
    await queryClient.invalidateQueries({ queryKey: ['progression-policy', policyType] });
    const rows = await progressionPolicyService.list(policyType);
    queryClient.setQueryData(['progression-policy', policyType], rows);
    return rows;
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (parsedMaxLevel === null || parsedVersion === null) {
        throw new Error('Enter a valid whole max level and version.');
      }
      return progressionPolicyService.createDraft({
        policyType,
        maxLevel: parsedMaxLevel,
        version: parsedVersion,
        effectiveFrom: form.effectiveFrom || new Date().toISOString(),
        changeReason: form.changeReason,
      });
    },
    onSuccess: async (created) => {
      try {
        const readback = await readBack();
        if (!readback.some((policy) => policy.id === created.id)) {
          toast.error('Draft was saved but the server read-back did not return it.');
          return;
        }
        setShowCreate(false);
        toast.success(`Draft policy v${created.version} created and read back from server.`);
      } catch (err) {
        toast.error(asApiError(err).message ?? 'Draft created but the read-back failed.');
      }
    },
    onError: (err: unknown) =>
      toast.error(asApiError(err).message ?? 'Failed to create draft.'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => progressionPolicyService.activate(id),
    onSuccess: async (result) => {
      try {
        const readback = await readBack();
        const confirmed = readback.some(
          (policy) => policy.id === result.policy.id && policy.status === 'active',
        );
        if (!confirmed) {
          toast.error('Activation was not confirmed by the server read-back.');
          return;
        }
        toast.success(
          result.duplicate
            ? `Policy v${result.policy.version} was already the active version.`
            : `Policy v${result.policy.version} is now active (L${result.policy.maxLevel}).`,
        );
      } catch (err) {
        toast.error(asApiError(err).message ?? 'Activation succeeded but the read-back failed.');
      }
    },
    onError: (err: unknown) =>
      toast.error(asApiError(err).message ?? 'Failed to activate.'),
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
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Supported range: 1–{limits.supportedMaxLevel}. Activation is rejected when the new cap is
            below the highest level already observed in this domain.
          </p>
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
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-3">Version</th>
                  <th className="py-2 pr-3">Max level</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Effective window</th>
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
                    <td className="py-2 pr-3 text-xs text-gray-500">
                      {new Date(p.effectiveFrom).toLocaleString()} →{' '}
                      {p.effectiveTo ? new Date(p.effectiveTo).toLocaleString() : 'no end'}
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
            <Input
              label={`Max level (1–${limits.supportedMaxLevel})`}
              type="number"
              min={1}
              max={limits.supportedMaxLevel}
              value={form.maxLevel}
              error={maxLevelError ?? undefined}
              onChange={(e) => setForm({ ...form, maxLevel: e.target.value })}
            />
            <Input
              label="Version"
              type="number"
              min={1}
              value={form.version}
              error={versionError ?? undefined}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
            <Input
              label="Change reason (required)"
              value={form.changeReason}
              error={reasonError ?? undefined}
              onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
            />
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

  const {
    data: limits,
    isLoading: limitsLoading,
    isError: limitsError,
    error: limitsErrorObj,
    refetch: refetchLimits,
  } = useQuery({
    queryKey: ['progression-policy', 'limits'],
    queryFn: () => progressionPolicyService.getLimits(),
  });

  if (!canRead) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have <code>admin.read</code> — this page is unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Progression"
          description="Level timelines, thresholds and rewards. Policies own max-level caps; tracks own milestone thresholds; the Rule Engine owns event logic."
          icon={<TrendingUp className="h-6 w-6 text-indigo-500" />}
        />
        <Link
          href="/dashboard/progression-tracks"
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Progression tracks →
        </Link>
      </div>
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
      <QueryState
        isLoading={limitsLoading}
        isError={limitsError}
        error={limitsErrorObj}
        isEmpty={!limits}
        emptyMessage="Progression limits are unavailable."
        onRetry={() => refetchLimits()}
      >
        {limits && (
          <>
            {tab === 'player' && <PlayerLevelsTab canWrite={canWrite} limits={limits} />}
            {tab === 'room' && <RoomLevelsTab canWrite={canWrite} limits={limits} />}
            {tab === 'policies' && <PoliciesTab canWrite={canWrite} limits={limits} />}
          </>
        )}
      </QueryState>
      <p className="text-xs text-gray-400">
        ROOM_MEMBER_LEVEL is system-managed (formula-based, max 100) and GAME_LEVEL is reserved —
        neither has an Admin-authorable runtime today.
      </p>
    </div>
  );
}
