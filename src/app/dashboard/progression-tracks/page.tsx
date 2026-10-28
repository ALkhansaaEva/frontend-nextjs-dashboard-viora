'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, ShieldCheck, Ban, Pencil, Search, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState } from '@/shared/components/ui/QueryState';
import { RewardBundleV2Editor } from '@/shared/components/rewards/RewardBundleV2Editor';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import progressionTracksService, {
  AUTHORABLE_TRACK_TYPES,
  type ProgressionTrackType,
  type ProgressionTrackVersion,
  type ProgressionTrackThresholdInput,
  type ProgressionTrackVersionPolicy,
} from '@/services/progression-tracks.service';
import { isRewardBundleV2Shape, type RewardBundleV2 } from '@/types/rules';
import { humanizeToken } from '@/shared/lib/labels';

/** Every type the read API can return — filtering stays useful for auditing
 * rows authored elsewhere. */
const TRACK_TYPES: Array<{ value: ProgressionTrackType; label: string }> = [
  { value: 'CHAT_CONTRIBUTION_LEVEL', label: humanizeToken('CHAT_CONTRIBUTION_LEVEL') },
  { value: 'ROOM_MEMBER_LEVEL', label: humanizeToken('ROOM_MEMBER_LEVEL') },
  { value: 'GAME_LEVEL', label: `${humanizeToken('GAME_LEVEL')} (reserved — no runtime consumer)` },
];

const AUTHORABLE_TRACK_OPTIONS = AUTHORABLE_TRACK_TYPES.map((value) => ({
  value,
  label: humanizeToken(value),
}));

const VERSION_POLICIES: Array<{ value: ProgressionTrackVersionPolicy; label: string }> = [
  { value: 'RESET', label: 'RESET — clear held XP' },
  { value: 'CARRY_XP', label: 'CARRY_XP — keep XP, re-derive levels' },
  { value: 'RECOMPUTE_LEVEL', label: 'RECOMPUTE_LEVEL — keep levels, drop XP' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: humanizeToken('DRAFT') },
  { value: 'PUBLISHED', label: humanizeToken('PUBLISHED') },
  { value: 'DISABLED', label: humanizeToken('DISABLED') },
  { value: 'ARCHIVED', label: humanizeToken('ARCHIVED') },
];

function statusVariant(status: string): 'success' | 'default' | 'danger' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'DRAFT') return 'default';
  return 'danger';
}

/** Create and edit share one rule set: levels start at 1 and stay contiguous,
 * XP is a non-negative integer string and strictly increases per level. */
function thresholdValidationError(rows: ProgressionTrackThresholdInput[]): string | null {
  if (rows.length === 0) return 'At least one threshold is required.';
  let previous: bigint | null = null;
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    if (row.level !== index + 1) {
      return `Thresholds must start at level 1 and be contiguous (expected L${index + 1}, found L${row.level}).`;
    }
    if (!/^[0-9]+$/.test(row.requiredXp)) {
      return `Level ${row.level}: required XP must be a non-negative whole number.`;
    }
    const xp = BigInt(row.requiredXp);
    if (previous !== null && xp <= previous) {
      return `Level ${row.level}: required XP must be greater than level ${row.level - 1}.`;
    }
    previous = xp;
  }
  return null;
}

/* ───────────────────────── Create draft modal ───────────────────────── */

function CreateTrackModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [trackKey, setTrackKey] = useState('');
  const [trackType, setTrackType] = useState<ProgressionTrackType>(AUTHORABLE_TRACK_TYPES[0]);
  const [version, setVersion] = useState(1);
  const [thresholds, setThresholds] = useState<ProgressionTrackThresholdInput[]>([
    { level: 1, requiredXp: '0' },
    { level: 2, requiredXp: '100' },
  ]);

  const addThreshold = () =>
    setThresholds((prev) => {
      const last = prev[prev.length - 1];
      const nextXp = last ? (BigInt(last.requiredXp || '0') + BigInt(100)).toString() : '0';
      return [...prev, { level: prev.length + 1, requiredXp: nextXp }];
    });

  const removeThreshold = (level: number) =>
    setThresholds((prev) =>
      prev
        .filter((row) => row.level !== level)
        .map((row, index) => ({ ...row, level: index + 1 })),
    );

  const updateThreshold = (level: number, patch: Partial<ProgressionTrackThresholdInput>) =>
    setThresholds((prev) => prev.map((row) => (row.level === level ? { ...row, ...patch } : row)));

  const thresholdsError = useMemo(() => thresholdValidationError(thresholds), [thresholds]);

  const createMutation = useMutation({
    mutationFn: () =>
      progressionTracksService.create({ trackKey, trackType, version, thresholds }),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['progression-tracks'] });
      toast.success(`Draft track ${created.trackKey} v${created.version} created.`);
      onClose();
    },
    onError: (err: unknown) =>
      toast.error(err instanceof Error ? err.message : 'Failed to create track.'),
  });

  return (
    <Modal isOpen title="New progression track draft" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs font-medium text-gray-500">
          Track key (unique identity, e.g. CHAT_CONTRIBUTION_LEVEL)
          <Input className="mt-1 font-mono" value={trackKey} onChange={(e) => setTrackKey(e.target.value)} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-gray-500">
            Track type
            <Select
              className="mt-1"
              value={trackType}
              onChange={(e) => setTrackType(e.target.value as ProgressionTrackType)}
              options={AUTHORABLE_TRACK_OPTIONS}
            />
          </label>
          <label className="block text-xs font-medium text-gray-500">
            Version
            <Input
              type="number"
              className="mt-1"
              value={version}
              onChange={(e) => setVersion(parseInt(e.target.value, 10) || 1)}
            />
          </label>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">
              Thresholds (contiguous, strictly increasing — string-safe XP)
            </p>
            <Button size="sm" variant="outline" onClick={addThreshold}>
              <Plus className="mr-1 h-3 w-3" /> Level
            </Button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {thresholds.map((row) => (
              <div key={row.level} className="rounded border border-gray-200 p-2 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <Badge variant="default">L{row.level}</Badge>
                  <Input
                    className="flex-1 font-mono"
                    placeholder="required XP (integer string)"
                    value={row.requiredXp}
                    onChange={(e) => updateThreshold(row.level, { requiredXp: e.target.value })}
                  />
                  <Button size="sm" variant="outline" onClick={() => removeThreshold(row.level)}>
                    Remove
                  </Button>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">
                    Reward bundle{' '}
                    {row.rewardBundle ? `(${(row.rewardBundle as RewardBundleV2).components.length})` : '(none)'}
                  </summary>
                  <div className="mt-2">
                    <RewardBundleV2Editor
                      value={isRewardBundleV2Shape(row.rewardBundle) ? (row.rewardBundle as RewardBundleV2) : null}
                      onChange={(bundle) => updateThreshold(row.level, { rewardBundle: bundle })}
                    />
                  </div>
                </details>
              </div>
            ))}
          </div>
        </div>
        {thresholdsError && (
          <p className="text-xs text-red-600 dark:text-red-400">{thresholdsError}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!trackKey.trim() || !!thresholdsError || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create draft
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────────────────────── Track detail editor ───────────────────────── */

function TrackDetail({
  trackId,
  canWrite,
  onBack,
}: {
  trackId: string;
  canWrite: boolean;
  onBack: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: track, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-track', trackId],
    queryFn: () => progressionTracksService.getById(trackId),
  });
  const { data: history } = useQuery({
    queryKey: ['progression-track-history', track?.trackKey],
    queryFn: () => progressionTracksService.listByKey(track!.trackKey),
    enabled: !!track,
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProgressionTrackThresholdInput[]>([]);
  const [versionPolicy, setVersionPolicy] = useState<ProgressionTrackVersionPolicy>('CARRY_XP');

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['progression-track', trackId] });
    await queryClient.invalidateQueries({ queryKey: ['progression-tracks'] });
    if (track)
      await queryClient.invalidateQueries({
        queryKey: ['progression-track-history', track.trackKey],
      });
  };

  const saveMutation = useMutation({
    mutationFn: () => progressionTracksService.updateDraft(trackId, { thresholds: draft }),
    onSuccess: async () => {
      await invalidate();
      const readback = await progressionTracksService.getById(trackId);
      queryClient.setQueryData(['progression-track', trackId], readback);
      setEditing(false);
      toast.success('Draft saved and read back from server.');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Save failed.'),
  });

  const publishMutation = useMutation({
    mutationFn: () => progressionTracksService.publish(trackId, versionPolicy),
    onSuccess: async () => {
      await invalidate();
      toast.success(`Track published (${versionPolicy}). Previously published version archived.`);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Publish failed.'),
  });

  const disableMutation = useMutation({
    mutationFn: () => progressionTracksService.disable(trackId),
    onSuccess: async () => {
      await invalidate();
      toast.success('Track disabled.');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Disable failed.'),
  });

  const updateDraftRow = (level: number, patch: Partial<ProgressionTrackThresholdInput>) =>
    setDraft((prev) => prev.map((row) => (row.level === level ? { ...row, ...patch } : row)));

  const draftError = useMemo(
    () => (editing ? thresholdValidationError(draft) : null),
    [editing, draft],
  );

  return (
    <Card padding="none">
      <CardHeader className="flex-row items-center justify-between p-4 pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-bold">
          <Button size="sm" variant="outline" onClick={onBack} aria-label="Back to catalog">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
          {track ? (
            <>
              <span title={track.trackKey}>{humanizeToken(track.trackKey)}</span>
              <span className="font-mono text-[10px] font-normal text-gray-400">{track.trackKey}</span>
              <span className="text-xs font-normal text-gray-400">v{track.version}</span>
              <Badge variant={statusVariant(track.status)}>{humanizeToken(track.status)}</Badge>
            </>
          ) : (
            'Track'
          )}
        </CardTitle>
        {track && canWrite && (
          <div className="flex gap-2">
            {track.status === 'DRAFT' && !editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft(track.thresholds.map((threshold) => ({ ...threshold })));
                  setEditing(true);
                }}
              >
                <Pencil className="mr-1 h-3 w-3" /> Edit draft
              </Button>
            )}
            {track.status === 'DRAFT' && (
              <>
                <Select
                  className="w-56"
                  label="Version policy"
                  value={versionPolicy}
                  onChange={(e) => setVersionPolicy(e.target.value as ProgressionTrackVersionPolicy)}
                  options={VERSION_POLICIES}
                />
                <Button
                  size="sm"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                >
                  <ShieldCheck className="mr-1 h-3 w-3" /> Publish
                </Button>
              </>
            )}
            {(track.status === 'DRAFT' || track.status === 'PUBLISHED') && (
              <Button
                size="sm"
                variant="outline"
                disabled={disableMutation.isPending}
                onClick={() => disableMutation.mutate()}
              >
                <Ban className="mr-1 h-3 w-3" /> Disable
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <QueryState
          isLoading={isLoading}
          isError={isError}
          error={error}
          isEmpty={!track}
          emptyMessage="Track not found."
          onRetry={() => refetch()}
        >
          {track && (
            <div className="space-y-4">
              {track.status === 'PUBLISHED' && (
                <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                  Published versions are immutable. To change this track, create a new version
                  with the same track key and publish it.
                </p>
              )}
              <div className="space-y-2">
                {(editing ? draft : track.thresholds).map((row) => (
                  <div
                    key={row.level}
                    className="rounded border border-gray-200 p-2 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="default">L{row.level}</Badge>
                      {editing ? (
                        <Input
                          className="flex-1 font-mono"
                          value={row.requiredXp}
                          onChange={(e) => updateDraftRow(row.level, { requiredXp: e.target.value })}
                        />
                      ) : (
                        <span className="flex-1 font-mono text-sm">{row.requiredXp} XP</span>
                      )}
                      {row.rewardBundle && (
                        <Badge variant="success">
                          bundle ×{(row.rewardBundle as RewardBundleV2).components.length}
                        </Badge>
                      )}
                    </div>
                    {editing && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-500">
                          Reward bundle
                        </summary>
                        <div className="mt-2">
                          <RewardBundleV2Editor
                            value={
                              isRewardBundleV2Shape(row.rewardBundle)
                                ? (row.rewardBundle as RewardBundleV2)
                                : null
                            }
                            onChange={(bundle) => updateDraftRow(row.level, { rewardBundle: bundle })}
                          />
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              {editing && (
                <div className="space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!!draftError || saveMutation.isPending}
                      onClick={() => saveMutation.mutate()}
                    >
                      Save draft
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  {draftError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{draftError}</p>
                  )}
                </div>
              )}
              {history && history.length > 1 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-gray-500">Version history</p>
                  <div className="flex flex-wrap gap-2">
                    {history.map((row) => (
                      <span key={row.id} className="flex items-center gap-1 text-xs text-gray-500">
                        <Badge variant={statusVariant(row.status)}>v{row.version}</Badge>
                        {humanizeToken(row.status)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </QueryState>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function ProgressionTracksPage() {
  const hasPermission = useHasPermission();
  // Backend authority (progression-track.controller.ts): GET /admin/progression-tracks
  // → admin.read; create/update/publish/archive mutations → configs.write.
  const canWrite = hasPermission('configs.write');
  const canRead = hasPermission('admin.read');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trackType, setTrackType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const limit = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['progression-tracks', 'catalog', trackType, status, debouncedSearch, page],
    queryFn: () =>
      progressionTracksService.list({
        trackType: (trackType || undefined) as ProgressionTrackType | undefined,
        status: (status || undefined) as ProgressionTrackVersion['status'] | undefined,
        trackKey: debouncedSearch || undefined,
        limit,
        offset: page * limit,
      }),
  });
  const items = data?.items ?? [];

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
        title="Progression Tracks"
        description="Versioned milestone tracks (CHAT_CONTRIBUTION_LEVEL and other generic tracks). DRAFT is editable; PUBLISHED is immutable; publishing archives the previous version."
        icon={<Layers className="h-6 w-6 text-indigo-500" />}
        action={
          canWrite
            ? {
                label: 'New track draft',
                onClick: () => setShowCreate(true),
                icon: <Plus className="mr-1 h-3.5 w-3.5" />,
              }
            : undefined
        }
      />

      {selectedId ? (
        <TrackDetail trackId={selectedId} canWrite={canWrite} onBack={() => setSelectedId(null)} />
      ) : (
        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  className="w-64 pl-8"
                  placeholder="Search track key…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                className="w-64"
                value={trackType}
                onChange={(e) => {
                  setTrackType(e.target.value);
                  setPage(0);
                }}
                options={[{ value: '', label: 'All types' }, ...TRACK_TYPES]}
              />
              <Select
                className="w-44"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(0);
                }}
                options={STATUS_OPTIONS}
              />
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyMessage="No progression tracks match."
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
                      <th className="py-2 pr-3">Created</th>
                      <th className="py-2 text-right">Actions</th>
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
                          <Badge variant={statusVariant(item.status)}>{humanizeToken(item.status)}</Badge>
                        </td>
                        <td className="py-2 pr-3">{item.thresholdCount}</td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="outline" onClick={() => setSelectedId(item.id)}>
                            Open
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data && data.total > limit && (
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {data.total} track version(s) · page {page + 1}/
                    {Math.ceil(data.total / limit)}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(page + 1) * limit >= data.total}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </QueryState>
          </CardContent>
        </Card>
      )}

      {showCreate && <CreateTrackModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
