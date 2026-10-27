'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/store/toast.store';
import { RefreshCw, ToggleLeft, ToggleRight, AlertCircle, Coins, Save, Loader2, ImagePlus, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { configsService } from '@/services';
import { mediaService } from '@/services/media.service';
import { useCurrencyDisplay, useUpdateCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useHasPermission } from '@/hooks/usePermissions';
import type { FeatureFlag, SystemConfig } from '@/dto/configs/configs.dto';
import { apiOrigin } from '@/lib/api/base-url';
import {
  CURRENCY_ICON_ACCEPT,
  canonicalCurrencyIconRef,
  currencyIconFileError,
} from '@/shared/lib/currency-icon';

const API_ORIGIN = apiOrigin() ?? '';

/** Resolves a stored media ref to a browser-loadable URL (absolute refs pass through). */
function mediaDisplayUrl(ref: string): string {
  if (/^(https?:)?\/\//.test(ref)) return ref;
  return `${API_ORIGIN}${ref.startsWith('/') ? '' : '/'}${ref}`;
}

type SettingsTab = 'flags' | 'currency' | 'typed' | 'policies';
const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'flags', label: 'Feature Flags' },
  { id: 'currency', label: 'Currency Display' },
  { id: 'policies', label: 'Policy Center' },
  { id: 'typed', label: 'Configuration' },
];

export default function SettingsPage() {
  const hasPermission = useHasPermission();
  const canWrite = hasPermission('configs.write');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [configs, setConfigs] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('flags');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [flagsData, configsData] = await Promise.all([
        configsService.getFeatureFlags(),
        configsService.getConfigs(),
      ]);
      setFlags(flagsData);
      setConfigs(configsData);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFlag = async (flag: FeatureFlag) => {
    if (!canWrite) return;
    setIsSaving(true);
    try {
      await configsService.setFeatureFlag(
        flag.key,
        !flag.enabled,
        flag.rolloutPercent ?? undefined,
      );
      setFlags(flags.map(currentFlag =>
        currentFlag.key === flag.key ? { ...currentFlag, enabled: !flag.enabled } : currentFlag
      ));
    } catch (err) {
      console.error('Failed to update flag:', err);
      setError('Failed to update flag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshConfigs = async () => {
    if (!canWrite) return;
    setIsSaving(true);
    try {
      await configsService.refreshConfigs();
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh configs:', err);
      setError('Failed to refresh configs');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Runtime configuration, presentation metadata and links to domain-owned policies.</p>
        </div>
        <div className="flex gap-2">
          {canWrite && <Button variant="outline" onClick={handleRefreshConfigs} disabled={isSaving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            Refresh Configs
          </Button>}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {!canWrite && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
          Read-only settings view. The <code>configs.write</code> permission is required for feature flags, typed config, currency display, and server refresh operations.
        </div>
      )}

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 ${
              activeTab === tab.id
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'currency' && <CurrencyDisplaySettings />}

      {activeTab === 'policies' && <PolicyCenter />}

      {activeTab === 'typed' && <ConfigurationSettings configs={configs} onSaved={fetchData} />}

      {activeTab === 'flags' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flags.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No feature flags configured</p>
              ) : (
                flags.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{flag.key}</p>
                      {flag.description && (
                        <p className="text-sm text-gray-500">{flag.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {flag.rolloutPercent != null && (
                        <span className="text-xs text-gray-500">{flag.rolloutPercent}% rollout</span>
                      )}
                      <button
                        onClick={() => handleToggleFlag(flag)}
                        disabled={isSaving || !canWrite}
                        aria-label={`${flag.enabled ? 'Disable' : 'Enable'} ${flag.key}`}
                        className="flex items-center disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {flag.enabled ? (
                          <ToggleRight className="w-8 h-8 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * GET/PUT /admin/currency-display (modules/wallet/currency-display.controller.ts).
 * Display metadata ONLY — the internal ledger key (`GAME_CURRENCY`) is fixed
 * and never editable here, per the backend's own doc comment on the entity.
 */
function CurrencyDisplaySettings() {
  const toast = useToast();
  const { data: config, isLoading, error } = useCurrencyDisplay();
  const updateMutation = useUpdateCurrencyDisplay();
  const hasPermission = useHasPermission();
  const canWrite = hasPermission('configs.write');
  const canUpload = canWrite && hasPermission('media.write');
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconUploadError, setIconUploadError] = useState<string | null>(null);

  const [form, setForm] = useState<{ displayName: string; shortName: string; symbol: string; iconAssetRef: string; decimalDisplay: number; enabled: boolean; changeReason: string } | null>(null);

  useEffect(() => {
    if (config && !form) {
      setForm({
        displayName: config.displayName,
        shortName: config.shortName ?? '',
        symbol: config.symbol ?? '',
        iconAssetRef: config.iconAssetRef ?? '',
        decimalDisplay: config.decimalDisplay,
        enabled: config.enabled,
        changeReason: '',
      });
    }
  }, [config, form]);

  if (isLoading) return <p className="text-sm text-gray-400 py-4">Loading currency display config…</p>;
  if (error || !config || !form) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-600" />
        <p className="text-sm text-red-600 dark:text-red-400">Failed to load currency display configuration.</p>
      </div>
    );
  }

  const dirty = form.displayName !== config.displayName || form.shortName !== (config.shortName ?? '')
    || form.symbol !== (config.symbol ?? '') || form.iconAssetRef !== (config.iconAssetRef ?? '')
    || form.decimalDisplay !== config.decimalDisplay || form.enabled !== config.enabled;

  const uploadIcon = async (file: File) => {
    const validationError = currencyIconFileError(file);
    if (validationError) {
      setIconUploadError(validationError);
      return;
    }
    setIsUploadingIcon(true);
    setIconUploadError(null);
    try {
      const uploaded = await mediaService.uploadFile(file, 'assets', {
        altText: `${form.displayName || config.currencyCode} currency icon`,
        fileKind: 'image',
        filePurpose: 'currency_icon',
      });
      const iconAssetRef = canonicalCurrencyIconRef(uploaded);
      setForm((current) => current ? { ...current, iconAssetRef } : current);
      toast.success('Image uploaded. Add a change reason and save to publish it.');
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Currency icon upload failed.';
      setIconUploadError(message);
      toast.error(message);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Coins className="w-4 h-4 text-emerald-500" /> Currency Display</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-gray-800/50">
          <div>
            <p className="text-xs text-gray-500">Internal identifier (immutable)</p>
            <p className="font-mono font-semibold">{config.currencyCode}</p>
          </div>
          <p className="text-xs text-gray-400 sm:text-end">v{config.version} · used by wallet, store, gifts, agents, IAP, reconciliation</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Display name *" disabled={!canWrite} value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <Input label="Short name" disabled={!canWrite} value={form.shortName}
            onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
          <Input label="Symbol" disabled={!canWrite} value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="VC" />
          <Input label="Decimal display (0-6)" type="number" min={0} max={6} disabled={!canWrite} value={form.decimalDisplay}
            onChange={(e) => setForm({ ...form, decimalDisplay: Math.max(0, Math.min(6, parseInt(e.target.value) || 0)) })} />
        </div>

        <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              {form.iconAssetRef ? (
                // The stored ref is the backend's canonical relative path
                // (/v1/media/proxy/<bucket>/<file>) and there is no Next rewrite
                // for it, so it must be resolved against the API origin for
                // display — same approach as useUpload/badges.service.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaDisplayUrl(form.iconAssetRef)} alt="Currency icon preview" className="h-full w-full object-contain p-2" />
              ) : (
                <Coins className="h-9 w-9 text-gray-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Currency icon</p>
              <p className="mt-0.5 text-xs text-gray-500">PNG, JPG, WebP, AVIF or SVG · maximum 5 MB</p>
              <p className="mt-1 truncate font-mono text-[11px] text-gray-400" title={form.iconAssetRef || undefined}>
                {form.iconAssetRef || 'No custom icon — clients use the canonical fallback.'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
                  {isUploadingIcon ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {isUploadingIcon ? 'Uploading…' : 'Upload image'}
                  <input
                    type="file"
                    className="sr-only"
                    accept={CURRENCY_ICON_ACCEPT.join(',')}
                    disabled={!canUpload || isUploadingIcon}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadIcon(file);
                    }}
                  />
                </label>
                {form.iconAssetRef && canWrite && (
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...form, iconAssetRef: '' })}>
                    <X className="h-4 w-4" /> Use fallback
                  </Button>
                )}
              </div>
              {canWrite && !canUpload && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Upload requires <code>media.write</code>; an Admin with that permission can attach the asset.
                </p>
              )}
              {iconUploadError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{iconUploadError}</p>}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={!canWrite} checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          Enabled
        </label>

        {!canWrite && (
          <p className="text-xs text-gray-400">You have read-only access (<code>admin.read</code>) — <code>configs.write</code> is required to save changes.</p>
        )}

        {dirty && canWrite && (
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Input label="Change reason *" value={form.changeReason}
              onChange={(e) => setForm({ ...form, changeReason: e.target.value })}
              placeholder="Required by the backend audit trail" />
            <Button
              size="sm"
              disabled={!form.displayName.trim() || !form.changeReason.trim() || updateMutation.isPending || isUploadingIcon}
              onClick={() => updateMutation.mutate({
                displayName: form.displayName,
                shortName: form.shortName || null,
                symbol: form.symbol || null,
                iconAssetRef: form.iconAssetRef || null,
                decimalDisplay: form.decimalDisplay,
                enabled: form.enabled,
                changeReason: form.changeReason.trim(),
              })}
            >
              {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save changes
            </Button>
            {updateMutation.isError && <p className="text-xs text-red-500">Save failed — check the change reason and try again.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Every leaf key returned by `GET /configs` (4 groups / 30 keys, per
 * modules/configs/configs.service.ts). No key, unit, range or default is
 * invented here — everything below is transcribed from the backend contract.
 *
 * - `live`: validated server-side AND read by a verified runtime consumer
 *   (`ConfigsService.getVal`). Changes take effect after POST /configs/refresh.
 * - `live: false`: `POST /configs` persists it, but no runtime component reads
 *   it. Editing it is still allowed — it is stored config, just inert today.
 * - `readOnly`: the backend fixes the value or hardcodes its consumer, so this
 *   page renders the value and deliberately offers no editor.
 * - `fallback`: documented default / backend invariant, shown to the user and
 *   used when the key is absent or holds a non-matching type.
 */
type ConfigField = {
  key: string;
  label: string;
  section: string;
  help: string;
  live: boolean;
  readOnly?: boolean;
  /** Control kind. Only editable fields have one. */
  kind?: 'number' | 'boolean' | 'numberList';
  min?: number;
  max?: number;
  fallback?: number | number[];
  /** Ordinal prefix for repeatable rows, e.g. "Day". */
  itemLabel?: string;
  /** Live unit conversion shown under the input (ms → s, bps → %). */
  hint?: (value: number) => string;
};

const MIC_SLOTS_SUPERSEDED =
  'Superseded by the RoomLevelConfig table — edit the level table under Progression. This value is stored but not read.';

const CONFIG_FIELDS: ConfigField[] = [
  // Room — Capacity
  {
    key: 'room.maxMembers',
    label: 'Room member capacity ceiling',
    section: 'Room Capacity',
    kind: 'number',
    min: 2,
    max: 200,
    live: true,
    help: 'Live admission limit. New rooms default to this value; lowering it blocks new joins without evicting current members.',
  },

  // Room — Creation
  {
    key: 'room.creation.enabled',
    label: 'Room creation enabled',
    section: 'Room Creation',
    kind: 'boolean',
    live: true,
    help: 'Master switch for player-initiated room creation.',
  },
  {
    key: 'room.creation.minimumPlayerLevel',
    label: 'Minimum player level to create a room',
    section: 'Room Creation',
    kind: 'number',
    min: 1,
    max: 1000000,
    live: true,
    help: 'Level a player must hold before room creation unlocks.',
  },
  {
    key: 'room.creation.maximumActiveRooms',
    label: 'Maximum active rooms',
    section: 'Room Creation',
    readOnly: true,
    fallback: 1,
    live: true,
    help: 'Fixed at 1 by a backend invariant — the read path rejects any other value, so this cannot be edited here.',
  },

  // Room — Moderation
  {
    key: 'room.kickDurations',
    label: 'Kick durations',
    section: 'Moderation',
    readOnly: true,
    live: false,
    help: 'The backend hardcodes 2h and 12m at the call site. This key is stored for reference and is not consumed at runtime.',
  },

  // Room — Rounds & gift behaviour
  {
    key: 'room.rounds.countdownMs',
    label: 'Round countdown (ms)',
    section: 'Rounds & Gift Behavior',
    kind: 'number',
    min: 1000,
    max: 30000,
    live: true,
    hint: (value) => `${value} ms = ${value / 1000} s`,
    help: 'Delay in milliseconds before a round starts.',
  },
  {
    key: 'room.rounds.overtimeSeconds',
    label: 'Overtime duration (s)',
    section: 'Rounds & Gift Behavior',
    kind: 'number',
    min: 0,
    max: 300,
    live: true,
    help: 'Extra seconds granted to a round once it goes to overtime.',
  },
  {
    key: 'room.rounds.giftScoreBps',
    label: 'Gift score (bps)',
    section: 'Rounds & Gift Behavior',
    kind: 'number',
    min: 0,
    max: 10000,
    live: true,
    hint: (value) => `${value} bps = ${value / 100}%`,
    help: 'Score granted per gift, in basis points (100 bps = 1%).',
  },
  {
    key: 'room.rounds.joinRequestTimeoutMs',
    label: 'Join request timeout (ms)',
    section: 'Rounds & Gift Behavior',
    kind: 'number',
    min: 10000,
    max: 300000,
    live: true,
    help: 'How long a join request waits for a decision before it is dropped.',
  },
  {
    key: 'room.rounds.spectatorGiftSupport',
    label: 'Spectator gifting',
    section: 'Rounds & Gift Behavior',
    kind: 'boolean',
    live: true,
    help: 'Allow spectators to send gifts during a round.',
  },

  // Room — mic slots (kept visible, superseded by the level table)
  {
    key: 'room.defaultMicSlots',
    label: 'Default mic slots',
    section: 'Room Mic Slots (superseded)',
    kind: 'number',
    live: false,
    help: MIC_SLOTS_SUPERSEDED,
  },
  {
    key: 'room.maxMicSlots',
    label: 'Max mic slots',
    section: 'Room Mic Slots (superseded)',
    kind: 'number',
    live: false,
    help: MIC_SLOTS_SUPERSEDED,
  },
  {
    key: 'room.micSlotsAtLevel',
    label: 'Mic slots level threshold',
    section: 'Room Mic Slots (superseded)',
    kind: 'number',
    live: false,
    help: MIC_SLOTS_SUPERSEDED,
  },

  // Game — General
  {
    key: 'game.turnTimeoutSeconds',
    label: 'Turn timeout (s)',
    section: 'Game – General',
    kind: 'number',
    fallback: 30,
    live: false,
    help: 'Seconds a player has to finish a turn.',
  },

  // Game — Ludo
  {
    key: 'game.ludo.playerCount',
    label: 'Ludo players',
    section: 'Game – Ludo',
    kind: 'number',
    fallback: 2,
    live: false,
    help: 'How many players a Ludo board seats.',
  },
  {
    key: 'game.ludo.tokensPerPlayer',
    label: 'Ludo tokens per player',
    section: 'Game – Ludo',
    kind: 'number',
    fallback: 4,
    live: false,
    help: 'Tokens handed to each player.',
  },
  {
    key: 'game.ludo.boardSize',
    label: 'Ludo board size',
    section: 'Game – Ludo',
    kind: 'number',
    fallback: 52,
    live: false,
    help: 'Number of cells on the board.',
  },
  {
    key: 'game.ludo.winPosition',
    label: 'Ludo win position',
    section: 'Game – Ludo',
    kind: 'number',
    fallback: 57,
    live: false,
    help: 'Cell index a token must reach to win.',
  },
  {
    key: 'game.ludo.safeCells',
    label: 'Ludo safe cells',
    section: 'Game – Ludo',
    kind: 'numberList',
    fallback: [0, 8, 13, 21, 26, 34, 39, 47],
    itemLabel: 'Cell',
    live: false,
    help: 'Board cell indices marked as safe.',
  },

  // Game — Domino
  {
    key: 'game.domino.playerCount',
    label: 'Domino players',
    section: 'Game – Domino',
    kind: 'number',
    fallback: 2,
    live: false,
    help: 'How many players a Domino match seats.',
  },
  {
    key: 'game.domino.tilesPerPlayer',
    label: 'Domino tiles per player',
    section: 'Game – Domino',
    kind: 'number',
    fallback: 7,
    live: false,
    help: 'Tiles dealt to each player.',
  },
  {
    key: 'game.domino.maxTileValue',
    label: 'Domino max tile value',
    section: 'Game – Domino',
    kind: 'number',
    fallback: 6,
    live: false,
    help: 'Highest value printed on a tile.',
  },

  // Rewards
  {
    key: 'rewards.matchWin.gameCurrency',
    label: 'Match win (game currency)',
    section: 'Rewards',
    kind: 'number',
    fallback: 0,
    live: false,
    help: 'Game currency granted for a match won.',
  },
  {
    key: 'rewards.matchWin.xp',
    label: 'Match win (XP)',
    section: 'Rewards',
    kind: 'number',
    fallback: 50,
    live: false,
    help: 'Experience granted for a match won.',
  },
  {
    key: 'rewards.matchLoss.gameCurrency',
    label: 'Match loss (game currency)',
    section: 'Rewards',
    kind: 'number',
    fallback: 0,
    live: false,
    help: 'Game currency granted for a match lost.',
  },
  {
    key: 'rewards.matchLoss.xp',
    label: 'Match loss (XP)',
    section: 'Rewards',
    kind: 'number',
    fallback: 15,
    live: false,
    help: 'Experience granted for a match lost.',
  },
  {
    key: 'rewards.taskDefault.gameCurrency',
    label: 'Task default (game currency)',
    section: 'Rewards',
    kind: 'number',
    fallback: 0,
    live: false,
    help: 'Default game currency granted by a task.',
  },
  {
    key: 'rewards.dailyLogin',
    label: 'Daily login rewards (game currency)',
    section: 'Rewards',
    kind: 'numberList',
    fallback: [50, 100, 150, 200, 250, 300, 500],
    itemLabel: 'Day',
    live: false,
    help: 'Ordered amounts — row 1 is login day 1, row 2 is day 2, and so on. Order is significant.',
  },

  // Economy
  {
    key: 'economy.welcomeBonus.gameCurrency',
    label: 'Welcome bonus (game currency)',
    section: 'Economy',
    kind: 'number',
    fallback: 0,
    live: false,
    help: 'Game currency granted as the welcome bonus.',
  },
  {
    key: 'economy.giftDefaultCost',
    label: 'Gift default cost (game currency)',
    section: 'Economy',
    kind: 'number',
    fallback: 50,
    live: false,
    help: 'Default game-currency cost of a gift.',
  },
];

/** Section order follows first appearance in CONFIG_FIELDS. */
const CONFIG_SECTIONS = CONFIG_FIELDS.map((field) => field.section)
  .filter((section, index, all) => all.indexOf(section) === index);

type Draft = string | boolean | string[];

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

function readConfigValue(configs: SystemConfig | null, key: string): unknown {
  if (!configs) return undefined;
  const [group, ...rest] = key.split('.');
  if (!group) return undefined;
  let node: unknown = (configs as Record<string, unknown>)[group];
  for (const part of rest) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Coerces a `GET /configs` leaf into an editable draft. The response is
 * unvalidated network input, so a number/boolean leaf of the wrong type falls
 * back to the documented default (or to an empty input when none is
 * documented). List rows are stringified as-is and validated on save, so a
 * malformed value is reported instead of being silently replaced. */
function draftOf(field: ConfigField, configs: SystemConfig | null): Draft {
  const value = readConfigValue(configs, field.key);
  if (field.kind === 'boolean') return typeof value === 'boolean' ? value : false;
  if (field.kind === 'numberList') {
    const list: unknown[] = Array.isArray(value) ? value : (Array.isArray(field.fallback) ? field.fallback : []);
    return list.map((n) => String(n));
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return field.fallback != null ? String(field.fallback) : '';
}

/** Display form for keys the backend fixes or hardcodes a consumer for. */
function formatReadOnly(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? value.map((v) => String(v)).join(', ') : '—';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  return '—';
}

/** Draft → wire value for POST /configs { key, value }. Applies the same bounds
 * the backend enforces on its 9 live keys, and rejects non-integers. Throws on
 * the first bad field so the save aborts before any write. */
function toWireValue(field: ConfigField, draft: Draft): number | boolean | number[] {
  if (typeof draft === 'boolean') return draft;
  if (Array.isArray(draft)) {
    return draft.map((row) => {
      if (!/^-?\d+$/.test(row)) throw new Error(`${field.label}: "${row || '(empty)'}" must be an integer`);
      return Number(row);
    });
  }
  if (!/^-?\d+$/.test(draft)) throw new Error(`${field.label} must be an integer`);
  const value = Number(draft);
  if (field.min != null && value < field.min) throw new Error(`${field.label} must be at least ${field.min}`);
  if (field.max != null && value > field.max) throw new Error(`${field.label} must be at most ${field.max}`);
  return value;
}

function ConfigFieldControl({ field, value, onChange, disabled }: {
  field: ConfigField;
  value: Draft;
  onChange: (value: Draft) => void;
  disabled: boolean;
}) {
  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';

  if (field.kind === 'boolean') {
    const on = value === true;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={field.label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className="mt-1 flex items-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        {on
          ? <ToggleRight className="w-8 h-8 text-green-600" />
          : <ToggleLeft className="w-8 h-8 text-gray-400" />}
      </button>
    );
  }

  if (field.kind === 'numberList') {
    const rows = Array.isArray(value) ? value : [];
    const itemLabel = field.itemLabel ?? 'Row';
    return (
      <div className="mt-1 space-y-1.5">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-14 shrink-0 text-[10px] text-gray-400">{itemLabel} {index + 1}</span>
            <input
              type="number"
              step={1}
              value={row}
              disabled={disabled}
              aria-label={`${field.label} — ${itemLabel} ${index + 1}`}
              onChange={(e) => onChange(rows.map((current, i) => (i === index ? e.target.value : current)))}
              className={inputClass}
            />
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${itemLabel} ${index + 1}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="shrink-0 rounded-lg p-1 text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" disabled={disabled} onClick={() => onChange([...rows, '0'])}>
          Add row
        </Button>
      </div>
    );
  }

  const raw = typeof value === 'string' ? value : '';
  const parsed = /^-?\d+$/.test(raw) ? Number(raw) : null;
  return (
    <>
      <input
        id={`config-${field.key}`}
        type="number"
        step={1}
        min={field.min}
        max={field.max}
        value={raw}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 ${inputClass}`}
      />
      {field.hint && parsed != null && (
        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{field.hint(parsed)}</p>
      )}
    </>
  );
}

function ConfigurationSettings({ configs, onSaved }: { configs: SystemConfig | null; onSaved: () => void }) {
  const toast = useToast();
  const hasPermission = useHasPermission();
  const canWrite = hasPermission('configs.write');
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState(false);

  const currentOf = (field: ConfigField): Draft => draft[field.key] ?? draftOf(field, configs);
  const setField = (key: string, value: Draft) => setDraft((prev) => ({ ...prev, [key]: value }));

  const changedFields = CONFIG_FIELDS.filter((field) => {
    const edited = draft[field.key];
    return !field.readOnly && edited !== undefined && !sameDraft(edited, draftOf(field, configs));
  });

  const save = async () => {
    setSaving(true);
    try {
      for (const field of changedFields) {
        const edited = draft[field.key];
        if (edited === undefined) continue;
        await configsService.setConfig(field.key, toWireValue(field, edited));
      }
      await configsService.refreshConfigs();
      toast.success('Configuration saved and reloaded.');
      setDraft({});
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {CONFIG_SECTIONS.map((section) => (
        <Card key={section}>
          <CardHeader><CardTitle>{section}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CONFIG_FIELDS.filter((f) => f.section === section).map((field) => (
                <div key={field.key} className="block text-xs font-medium text-gray-500">
                  <div className="flex items-start justify-between gap-2">
                    {field.readOnly || field.kind !== 'number' ? (
                      <span className="font-medium text-gray-600 dark:text-gray-300">{field.label}</span>
                    ) : (
                      <label htmlFor={`config-${field.key}`} className="font-medium text-gray-600 dark:text-gray-300">
                        {field.label}
                      </label>
                    )}
                    <span
                      title={field.live
                        ? 'Affects runtime — validated and read by a verified consumer.'
                        : 'Stored only — persisted by POST /configs, but no runtime component reads it.'}
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        field.live
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {field.live ? 'LIVE' : 'Stored only'}
                    </span>
                  </div>

                  {field.readOnly ? (
                    <p className="mt-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                      {formatReadOnly(readConfigValue(configs, field.key) ?? field.fallback)}
                    </p>
                  ) : (
                    <ConfigFieldControl
                      field={field}
                      value={currentOf(field)}
                      onChange={(value) => setField(field.key, value)}
                      disabled={!canWrite || saving}
                    />
                  )}

                  <span className="mt-0.5 block font-mono text-[10px] text-gray-400">{field.key}</span>
                  {field.fallback != null && (
                    <span className="mt-0.5 block text-[11px] text-gray-400">
                      {field.readOnly ? 'Fixed value' : 'Default'}: {Array.isArray(field.fallback)
                        ? field.fallback.join(', ')
                        : field.fallback}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] font-normal leading-relaxed text-gray-500 dark:text-gray-400">
                    {field.help}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      {canWrite && (
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving || changedFields.length === 0}>
            {saving ? 'Saving…' : 'Save changes (' + changedFields.length + ')'}
          </Button>
          <p className="text-xs text-gray-400">
            Writes POST /configs per changed key, then reloads server config.
          </p>
        </div>
      )}
    </div>
  );
}
/**
 * Policy Center — grouped READ hub over the REAL domain-specific policy
 * authorities. There is deliberately NO universal policy table: each policy
 * is owned by its canonical backend domain, and "Manage" deep-links into
 * that domain's existing editor (versioning, audit, activation semantics
 * stay in the owning authority).
 */
function PolicyCenter() {
  const groups: Array<{
    domain: string;
    policies: Array<{ name: string; authority: string; route?: string; note: string }>;
  }> = [
    {
      domain: 'Economy & Pricing',
      policies: [
        { name: 'Store Offers (pricing/window/regions/limits)', authority: 'StoreOfferService — admin/store/offers', route: '/dashboard/store/offers', note: 'Activation-window versioned; receipts snapshot the applied offer' },
        { name: 'Paid Room Entry Pricing', authority: 'RoomAccessService — admin/rooms/:id/access-policy', route: '/dashboard/rooms', note: 'Versioned policy history + audit per room' },
        { name: 'Currency Display', authority: 'CurrencyDisplayConfig', route: '/dashboard/settings', note: 'Display metadata only — never wallet authority' },
        { name: 'IAP Product / Entitlement Policy', authority: 'IapService — admin/iap/products', route: '/dashboard/payments/iap', note: 'Provider bindings + grant targets; audited' },
      ],
    },
    {
      domain: 'Progression & Rewards',
      policies: [
        { name: 'Player Level Policy (thresholds/rewards/max)', authority: 'LevelConfigAdminService', route: '/dashboard/progression', note: 'RewardBundleV2 only; xpRequired=0 allowed at level 1' },
        { name: 'Room Level Policy (mic slots/seats/unlocks)', authority: 'RoomLevelPolicyService', route: '/dashboard/progression', note: 'Capabilities separated from level rewards' },
        { name: 'Progression Tracks (generic)', authority: 'ProgressionTrackService — admin/progression-tracks', route: '/dashboard/progression-tracks', note: 'Versioned; explicit publish; RESET/CARRY policies' },
        { name: 'Room / Match Gift Policies', authority: 'GiftPolicyService — admin/gift-policies', note: 'Context-versioned authority; admin read/list API is not available yet, so no policy editor is exposed' },
      ],
    },
    {
      domain: 'Agents & Distribution',
      policies: [
        { name: 'Agent Limits / Commission / Funding', authority: 'AgentPolicy + AgentGovernance', route: '/dashboard/agents', note: 'Financial authority; audited transitions' },
        { name: 'Distributor Allocation / Exchange Rates', authority: 'DistributionCommerce + ExchangeRateService', route: '/dashboard/distributors', note: 'Settlement + rate policy; reconciliation-backed' },
      ],
    },
    {
      domain: 'Engagement',
      policies: [
        { name: 'Rules / Tasks / Achievements lifecycle', authority: 'RuleDefinitionService — admin/rules', route: '/dashboard/gameplay/rules', note: 'Draft→Validated→Published; published versions immutable' },
        { name: 'Campaign Schedules & Eligibility', authority: 'CampaignDefinition + scheduler', route: '/dashboard/campaigns', note: 'References real RuleDefinition IDs only' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.domain}>
          <CardHeader>
            <CardTitle className="text-sm font-bold">{group.domain}</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="py-2 pr-3">Policy</th>
                    <th className="py-2 pr-3">Canonical authority</th>
                    <th className="py-2 pr-3">Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.policies.map((policy) => (
                    <tr key={policy.name}>
                      <td className="py-2 pr-3 font-medium">{policy.name}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{policy.authority}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{policy.note}</td>
                      <td className="py-2 text-right">
                        {policy.route ? (
                          <Link href={policy.route} className="text-indigo-600 hover:underline text-sm">Manage →</Link>
                        ) : (
                          <span className="text-xs text-amber-600 dark:text-amber-400">Read API gap</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-gray-400">
        Each policy is owned by its canonical backend domain — versioning, audit, activation and cache invalidation
        are enforced by that authority, never by this page. Financial records stay under Reports/Reconciliation.
      </p>
    </div>
  );
}
