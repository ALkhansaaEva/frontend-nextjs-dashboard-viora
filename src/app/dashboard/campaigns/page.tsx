'use client';

import { useMemo, useState } from 'react';
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Plus, ShieldCheck, Ban, Archive, Eye, Pencil, ImageIcon } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { QueryState } from '@/shared/components/ui/QueryState';
import { TagInput } from '@/shared/components/ui/TagInput';
import { RuleSelector } from '@/shared/components/rules/RuleSelector';
import { MediaAssetIdUpload } from '@/shared/components/upload/MediaAssetIdUpload';
import { useHasPermission } from '@/hooks/usePermissions';
import { useToast } from '@/store/toast.store';
import { cn } from '@/shared/lib/utils';
import campaignsService, { type CampaignDefinition, type CampaignStatus, type ManualCampaignStatus } from '@/services/campaigns.service';
import mediaService, { type MediaFile } from '@/services/media.service';
import apiClient from '@/lib/api/api-client';
import { getCampaignAdminActions } from '@/shared/lib/campaign-lifecycle';
import { apiOrigin } from '@/lib/api/base-url';
import { humanizeToken } from '@/shared/lib/labels';

const STATUS_BADGE: Record<CampaignStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  draft: 'default', scheduled: 'warning', active: 'success', ended: 'default', disabled: 'danger', archived: 'danger',
};

/** Same public-proxy rule the gifts page and the shared upload preview use for
 * MediaController output. Campaigns only ever store a MediaFile UUID, so the
 * cover is resolved through mediaService.getAdminFileById. */
const API_ORIGIN = apiOrigin() ?? '';

function mediaDisplayUrl(media: Pick<MediaFile, 'thumbnailUrl' | 'path'> | null | undefined): string {
  if (!media) return '';
  if (media.thumbnailUrl) return media.thumbnailUrl;
  const path = media.path;
  if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
  return `${API_ORIGIN}/v1/media/proxy/${path}`;
}

/** Campaign cover. A null mediaId, an unresolvable id, or a dead URL all render
 * the neutral glyph — a campaign never shows a broken image. The failure is
 * remembered per-URL, so a later re-resolve of the same campaign heals itself
 * without an effect. */
function CampaignCover({ mediaId, url, className }: { mediaId: string | null; url?: string; className?: string }) {
  const [brokenUrl, setBrokenUrl] = useState<string | undefined>();

  if (!mediaId || !url || brokenUrl === url) {
    return (
      <div className={cn('flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400', className)} aria-hidden="true">
        <ImageIcon className="h-4 w-4" />
      </div>
    );
  }
  return (
    // Media proxy URL from the Media service; next/image has no loader for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" onError={() => setBrokenUrl(url)} className={cn('object-cover', className)} />
  );
}

/**
 * Campaigns / Live Events — admin/campaigns (modules/gameplay-events/campaign-admin.controller.ts).
 * Campaigns reference existing RuleDefinitions by id (`ruleIds`) rather than
 * carrying their own graph — there is deliberately no embedded RuleBuilder
 * here; bind rules by id, author the rules themselves at /dashboard/gameplay/rules.
 */
export default function CampaignsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const hasPermission = useHasPermission();
  const canRead = hasPermission('admin.read');
  const canCreate = hasPermission('achievements.write');
  const canManageLifecycle = hasPermission('configs.write');

  const { data: campaigns, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsService.list(),
    enabled: canRead,
  });

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CampaignDefinition | null>(null);
  const [form, setForm] = useState({
    campaignKey: '', version: 1, nameEn: '', nameAr: '', startLocal: '', endLocal: '',
    eligibleRegions: [] as string[], eligibleGames: [] as string[], ruleIds: [] as string[],
    mediaId: '', visualMetadata: '',
    changeReason: '',
  });

  const EMPTY_FORM = {
    campaignKey: '', version: 1, nameEn: '', nameAr: '', startLocal: '', endLocal: '',
    eligibleRegions: [] as string[], eligibleGames: [] as string[], ruleIds: [] as string[],
    mediaId: '', visualMetadata: '',
    changeReason: '',
  };

  // Covers are only MediaFile ids; resolve them once per distinct id and cache
  // the MediaFile forever (staleTime: Infinity) — the assets are immutable.
  const coverMediaIds = useMemo(() => {
    const ids = new Set<string>();
    for (const campaign of campaigns ?? []) if (campaign.mediaId) ids.add(campaign.mediaId);
    if (selected?.mediaId) ids.add(selected.mediaId);
    return Array.from(ids);
  }, [campaigns, selected]);

  const coverQueries = useQueries({
    queries: coverMediaIds.map((id) => ({
      queryKey: ['media-file', id],
      queryFn: () => mediaService.getAdminFileById(id),
      staleTime: Infinity,
      retry: false,
    })),
  });

  const coverUrlById = useMemo(() => {
    const map = new Map<string, string>();
    coverMediaIds.forEach((id, index) => {
      const url = mediaDisplayUrl(coverQueries[index]?.data);
      if (url) map.set(id, url);
    });
    return map;
  }, [coverMediaIds, coverQueries]);

  /** `visualMetadata` is a free-form object on the DTO — parse once, and report
   * a bad value inline instead of letting the mutation 400. */
  const parsedVisualMetadata = useMemo((): Record<string, unknown> | null | 'invalid' => {
    const text = form.visualMetadata.trim();
    if (!text) return null;
    try {
      const value: unknown = JSON.parse(text);
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return 'invalid';
      return value as Record<string, unknown>;
    } catch {
      return 'invalid';
    }
  }, [form.visualMetadata]);

  const visualMetadataError = parsedVisualMetadata === 'invalid';
  // Narrowed copy for the mutation bodies; `formValid` blocks submit on invalid.
  const visualMetadataValue = visualMetadataError ? null : parsedVisualMetadata;

  /** `datetime-local` needs a `YYYY-MM-DDTHH:mm` string, the API a strict
   * DateString — hold the local value in state and convert once on submit. */
  function toLocalInputValue(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowCreate(true);
  };

  const openEdit = (campaign: CampaignDefinition) => {
    setForm({
      campaignKey: campaign.campaignKey,
      version: campaign.version,
      nameEn: campaign.displayName?.en ?? '',
      nameAr: campaign.displayName?.ar ?? '',
      startLocal: toLocalInputValue(campaign.startAt),
      endLocal: toLocalInputValue(campaign.endAt),
      eligibleRegions: [...(campaign.eligibleRegions ?? [])],
      eligibleGames: [...(campaign.eligibleGames ?? [])],
      ruleIds: [...(campaign.ruleIds ?? [])],
      mediaId: campaign.mediaId ?? '',
      visualMetadata:
        campaign.visualMetadata && Object.keys(campaign.visualMetadata).length > 0
          ? JSON.stringify(campaign.visualMetadata, null, 2)
          : '',
      changeReason: '',
    });
    setEditingId(campaign.id);
    setShowCreate(true);
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingId(null);
  };

  const { data: gamesCatalog } = useQuery({
    queryKey: ['games-catalog'],
    queryFn: async () => {
      const response = await apiClient.get<{ games: Array<{ gameType: string; name?: string | Record<string, string> }> }>('/games');
      return response.games ?? [];
    },
    staleTime: 10 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: () => campaignsService.createDraft({
      campaignKey: form.campaignKey,
      version: form.version,
      displayName: { en: form.nameEn, ...(form.nameAr ? { ar: form.nameAr } : {}) },
      startAt: new Date(form.startLocal).toISOString(),
      endAt: new Date(form.endLocal).toISOString(),
      eligibleRegions: form.eligibleRegions.length ? form.eligibleRegions : undefined,
      eligibleGames: form.eligibleGames.length ? form.eligibleGames : undefined,
      ruleIds: form.ruleIds.length ? form.ruleIds : undefined,
      mediaId: form.mediaId || null,
      ...(visualMetadataValue ? { visualMetadata: visualMetadataValue } : {}),
      changeReason: form.changeReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign draft created.');
      closeForm();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to create campaign draft.'),
  });

  // Same form, PATCHed onto an existing campaign. Arrays are sent verbatim
  // (not dropped when empty) so an operator can actually clear eligibility.
  const updateMutation = useMutation({
    mutationFn: () => campaignsService.updateDraft(editingId!, {
      version: form.version,
      displayName: { en: form.nameEn, ...(form.nameAr ? { ar: form.nameAr } : {}) },
      startAt: new Date(form.startLocal).toISOString(),
      endAt: new Date(form.endLocal).toISOString(),
      eligibleRegions: form.eligibleRegions,
      eligibleGames: form.eligibleGames,
      ruleIds: form.ruleIds,
      mediaId: form.mediaId || null,
      // An empty box clears the stored metadata rather than leaving it stale.
      visualMetadata: visualMetadataValue || {},
      changeReason: form.changeReason,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated.');
      closeForm();
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Failed to update campaign.'),
  });

  const scheduleMutation = useMutation({
    mutationFn: (id: string) => campaignsService.schedule(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign scheduled.'); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Schedule failed.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ManualCampaignStatus }) => campaignsService.setStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign status updated.'); },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : 'Status update failed.'),
  });

  const formValid =
    form.campaignKey.trim().length > 0 &&
    form.nameEn.trim().length > 0 &&
    Number.isInteger(form.version) && form.version >= 1 &&
    form.startLocal !== '' && form.endLocal !== '' &&
    !Number.isNaN(new Date(form.startLocal).getTime()) &&
    !Number.isNaN(new Date(form.endLocal).getTime()) &&
    new Date(form.endLocal).getTime() > new Date(form.startLocal).getTime() &&
    !visualMetadataError &&
    form.changeReason.trim().length > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Campaigns"
        description="Durable live-event definitions — draft, schedule, and activate; the rule engine reacts to CAMPAIGN_STARTED/CAMPAIGN_ENDED via bound Rules."
        icon={<CalendarClock className="w-5 h-5" />}
        action={canCreate ? { label: 'Create Campaign', onClick: openCreate, icon: <Plus className="w-4 h-4" /> } : undefined}
      />

      {!canRead ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500">
          You do not have <code>admin.read</code>.
        </div>
      ) : (
        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-bold">Catalog {campaigns && <Badge variant="outline">{campaigns.length} total</Badge>}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              allowed={canRead}
              requiredPermission="admin.read"
              isEmpty={!campaigns || campaigns.length === 0}
              emptyMessage="No campaigns yet."
              loadingMessage="Loading campaigns…"
              onRetry={() => void refetch()}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="py-2 pr-3">Cover</th>
                      <th className="py-2 pr-3">Campaign</th>
                      <th className="py-2 pr-3">Version</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Window</th>
                      <th className="py-2 pr-3">Counts</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(campaigns ?? []).map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 pr-3">
                          <CampaignCover
                            mediaId={c.mediaId}
                            url={c.mediaId ? coverUrlById.get(c.mediaId) : undefined}
                            className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <p className="font-medium">{c.displayName?.en || '—'}</p>
                          {c.displayName?.ar && (
                            <p className="text-xs text-gray-500" dir="rtl">{c.displayName.ar}</p>
                          )}
                          <p className="text-xs font-mono text-gray-400">{c.campaignKey}</p>
                        </td>
                        <td className="py-2 pr-3">{c.version}</td>
                        <td className="py-2 pr-3"><Badge variant={STATUS_BADGE[c.status]}>{humanizeToken(c.status)}</Badge></td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          {new Date(c.startAt).toLocaleDateString()} → {new Date(c.endAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3 text-xs text-gray-500">
                          <span className="block">
                            {c.eligibleRegions.length || 'All'} regions · {c.eligibleGames.length || 'All'} games
                          </span>
                          <span className="block">{c.ruleIds.length} rules</span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelected(c)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> Details
                          </Button>
                          {canCreate && c.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                            </Button>
                          )}
                          {canManageLifecycle && getCampaignAdminActions(c.status).includes('schedule') && (
                            <Button size="sm" variant="outline" disabled={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate(c.id)}>
                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Schedule
                            </Button>
                          )}
                          {canManageLifecycle && getCampaignAdminActions(c.status).includes('disable') && (
                            <Button size="sm" variant="danger" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: c.id, status: 'disabled' })}>
                              <Ban className="w-3.5 h-3.5 mr-1" /> Disable
                            </Button>
                          )}
                          {canManageLifecycle && getCampaignAdminActions(c.status).includes('archive') && (
                            <Button size="sm" variant="outline" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: c.id, status: 'archived' })}>
                              <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                            </Button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </QueryState>
          </CardContent>
        </Card>
      )}

      <Modal isOpen={showCreate} onClose={closeForm} title={editingId ? 'Edit campaign' : 'Create Campaign draft'} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Card padding="sm">
            <CardHeader className="mb-2">
              <CardTitle className="text-sm font-bold">General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Campaign key *" value={form.campaignKey} disabled={!!editingId} onChange={(e) => setForm({ ...form, campaignKey: e.target.value.toUpperCase() })} placeholder="RAMADAN_EVENT" className="font-mono" />
                <Input label="Version" type="number" min={1} value={form.version} onChange={(e) => setForm({ ...form, version: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Name (EN) *" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
                <Input label="Name (AR)" dir="rtl" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card padding="sm">
            <CardHeader className="mb-2">
              <CardTitle className="text-sm font-bold">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Start *" type="datetime-local" value={form.startLocal} onChange={(e) => setForm({ ...form, startLocal: e.target.value })} />
                <Input label="End *" type="datetime-local" value={form.endLocal} onChange={(e) => setForm({ ...form, endLocal: e.target.value })} />
              </div>
              {form.startLocal !== '' && form.endLocal !== '' && new Date(form.endLocal).getTime() <= new Date(form.startLocal).getTime() && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">The window end must be after its start.</p>
              )}
              <Input label="Change reason *" value={form.changeReason} onChange={(e) => setForm({ ...form, changeReason: e.target.value })} placeholder="Required by the backend audit trail" />
            </CardContent>
          </Card>

          <Card padding="sm">
            <CardHeader className="mb-2">
              <CardTitle className="text-sm font-bold">Visuals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MediaAssetIdUpload
                value={form.mediaId}
                onChange={(mediaId) => setForm({ ...form, mediaId })}
                label="Cover image (optional)"
              />
              <div>
                <label htmlFor="campaign-visual-metadata" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Visual metadata (optional JSON object)
                </label>
                <textarea
                  id="campaign-visual-metadata"
                  rows={4}
                  value={form.visualMetadata}
                  onChange={(e) => setForm({ ...form, visualMetadata: e.target.value })}
                  placeholder={'{\n  "themeColor": "#7C3AED"\n}'}
                  aria-invalid={visualMetadataError}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                {visualMetadataError && (
                  <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
                    Must be a valid JSON object, e.g. {`{"themeColor": "#7C3AED"}`}.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card padding="sm">
            <CardHeader className="mb-2">
              <CardTitle className="text-sm font-bold">Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TagInput
                label="Eligible regions (ISO2 codes, optional)"
                value={form.eligibleRegions}
                onChange={(values) => setForm({ ...form, eligibleRegions: values })}
                placeholder="Type an ISO2 code and press Enter"
                normalize={(token) => token.toUpperCase()}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Eligible games (from game catalog, optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {(gamesCatalog ?? []).map((game) => {
                    const active = form.eligibleGames.includes(game.gameType);
                    return (
                      <button
                        key={game.gameType}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setForm({
                            ...form,
                            eligibleGames: active
                              ? form.eligibleGames.filter((g) => g !== game.gameType)
                              : [...form.eligibleGames, game.gameType],
                          })
                        }
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white ring-indigo-600'
                            : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'
                        }`}
                      >
                        {typeof game.name === 'string' ? game.name : game.name?.en ?? humanizeToken(game.gameType)}
                      </button>
                    );
                  })}
                  {!gamesCatalog && <span className="text-xs text-gray-400">Loading catalog…</span>}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bound Rules (search & select — UUIDs secondary)
                </label>
                <RuleSelector
                  selectedIds={form.ruleIds}
                  onChange={(ids) => setForm({ ...form, ruleIds: ids })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            {editingId ? (
              <Button
                disabled={!formValid || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                Save changes
              </Button>
            ) : (
              <Button
                disabled={!formValid || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Create draft
              </Button>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.displayName.en || selected?.campaignKey || 'Campaign details'} size="lg">
        {selected && (
          <div className="space-y-4 text-sm">
            <CampaignCover
              mediaId={selected.mediaId}
              url={selected.mediaId ? coverUrlById.get(selected.mediaId) : undefined}
              className="h-32 w-full rounded-xl border border-gray-200 dark:border-gray-700"
            />
            <div>
              <p className="font-semibold">{selected.displayName?.en || '—'}</p>
              {selected.displayName?.ar && <p className="text-gray-500" dir="rtl">{selected.displayName.ar}</p>}
              <p className="text-xs font-mono text-gray-400">{selected.campaignKey}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-xs text-gray-500">Status</p><Badge variant={STATUS_BADGE[selected.status]}>{humanizeToken(selected.status)}</Badge></div>
              <div><p className="text-xs text-gray-500">Version</p><p className="font-semibold">v{selected.version}</p></div>
              <div><p className="text-xs text-gray-500">Starts</p><p>{new Date(selected.startAt).toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">Ends</p><p>{new Date(selected.endAt).toLocaleString()}</p></div>
              <div><p className="text-xs text-gray-500">Cover media</p><p className="truncate font-mono text-xs">{selected.mediaId ?? '—'}</p></div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Eligibility</p>
              <p className="mt-1">Regions: {selected.eligibleRegions.length ? selected.eligibleRegions.join(', ') : 'All'}</p>
              <p>Games: {selected.eligibleGames.length ? selected.eligibleGames.map(humanizeToken).join(', ') : 'All'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Bound Rule IDs ({selected.ruleIds.length})</p>
              {selected.ruleIds.length ? (
                <ul className="mt-1 space-y-1 font-mono text-xs">{selected.ruleIds.map((id) => <li key={id}>{id}</li>)}</ul>
              ) : <p className="mt-1 text-gray-500">No rules bound.</p>}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Reward policy and multipliers are intentionally not exposed by the current admin response. Campaign execution and rewards remain owned by bound Rules.
            </div>
            <p className="text-xs text-gray-500">Activation and ending are scheduler-owned transitions based on the configured window.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
