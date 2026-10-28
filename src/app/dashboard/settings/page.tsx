'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useToast } from '@/store/toast.store';
import { RefreshCw, ToggleLeft, ToggleRight, AlertCircle, Coins, Save, Loader2, ImagePlus, X, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { QueryState } from '@/shared/components/ui/QueryState';
import { configsService } from '@/services';
import { mediaService } from '@/services/media.service';
import {
  levelConfigService,
  progressionPolicyService,
  roomLevelPolicyService,
  type ProgressionPolicyType,
} from '@/services/progression.service';
import { competitiveTierPolicyService } from '@/services/competitive-tier-policy.service';
import { useCurrencyDisplay, useUpdateCurrencyDisplay } from '@/hooks/useCurrencyDisplay';
import { useHasPermission } from '@/hooks/usePermissions';
import type { ConfigSchemaEntry, FeatureFlag, SystemConfig } from '@/dto/configs/configs.dto';
import { apiOrigin } from '@/lib/api/base-url';
import { humanizeToken } from '@/shared/lib/labels';
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

/** Display metadata for a config key. Bounds, kind, live flag, note and
 * compiled default are NOT duplicated here — they come from GET /configs/schema. */
type ConfigField = {
  key: string;
  label: string;
  section: string;
  help: string;
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
    help: 'Live admission limit. New rooms default to this value; lowering it blocks new joins without evicting current members.',
  },

  // Room — Creation
  {
    key: 'room.creation.enabled',
    label: 'Room creation enabled',
    section: 'Room Creation',
    help: 'Master switch for player-initiated room creation.',
  },
  {
    key: 'room.creation.minimumPlayerLevel',
    label: 'Minimum player level to create a room',
    section: 'Room Creation',
    help: 'Level a player must hold before room creation unlocks.',
  },
  {
    key: 'room.creation.maximumActiveRooms',
    label: 'Maximum active rooms',
    section: 'Room Creation',
    help: 'Fixed at 1 by a backend invariant — the read path rejects any other value, so this cannot be edited here.',
  },

  // Room — Moderation
  {
    key: 'room.kickDurations',
    label: 'Kick durations',
    section: 'Moderation',
    help: 'The backend hardcodes 2h and 12m at the call site. This key is stored for reference and is not consumed at runtime.',
  },

  // Room — Rounds & gift behaviour
  {
    key: 'room.rounds.countdownMs',
    label: 'Round countdown (ms)',
    section: 'Rounds & Gift Behavior',
    hint: (value) => `${value} ms = ${value / 1000} s`,
    help: 'Delay in milliseconds before a round starts.',
  },
  {
    key: 'room.rounds.overtimeSeconds',
    label: 'Overtime duration (s)',
    section: 'Rounds & Gift Behavior',
    help: 'Extra seconds granted to a round once it goes to overtime.',
  },
  {
    key: 'room.rounds.giftScoreBps',
    label: 'Gift score (bps)',
    section: 'Rounds & Gift Behavior',
    hint: (value) => `${value} bps = ${value / 100}%`,
    help: 'Score granted per gift, in basis points (100 bps = 1%).',
  },
  {
    key: 'room.rounds.joinRequestTimeoutMs',
    label: 'Join request timeout (ms)',
    section: 'Rounds & Gift Behavior',
    help: 'How long a join request waits for a decision before it is dropped.',
  },
  {
    key: 'room.rounds.spectatorGiftSupport',
    label: 'Spectator gifting',
    section: 'Rounds & Gift Behavior',
    help: 'Allow spectators to send gifts during a round.',
  },

  // Room — mic slots (kept visible, superseded by the level table)
  {
    key: 'room.defaultMicSlots',
    label: 'Default mic slots',
    section: 'Room Mic Slots (superseded)',
    help: MIC_SLOTS_SUPERSEDED,
  },
  {
    key: 'room.maxMicSlots',
    label: 'Max mic slots',
    section: 'Room Mic Slots (superseded)',
    help: MIC_SLOTS_SUPERSEDED,
  },
  {
    key: 'room.micSlotsAtLevel',
    label: 'Mic slots level threshold',
    section: 'Room Mic Slots (superseded)',
    help: MIC_SLOTS_SUPERSEDED,
  },

  // Game — General
  {
    key: 'game.turnTimeoutSeconds',
    label: 'Turn timeout (s)',
    section: 'Game – General',
    help: 'Seconds a player has to finish a turn.',
  },

  // Game — Ludo
  {
    key: 'game.ludo.playerCount',
    label: 'Ludo players',
    section: 'Game – Ludo',
    help: 'How many players a Ludo board seats.',
  },
  {
    key: 'game.ludo.tokensPerPlayer',
    label: 'Ludo tokens per player',
    section: 'Game – Ludo',
    help: 'Tokens handed to each player.',
  },
  {
    key: 'game.ludo.boardSize',
    label: 'Ludo board size',
    section: 'Game – Ludo',
    help: 'Number of cells on the board.',
  },
  {
    key: 'game.ludo.winPosition',
    label: 'Ludo win position',
    section: 'Game – Ludo',
    help: 'Cell index a token must reach to win.',
  },
  {
    key: 'game.ludo.safeCells',
    label: 'Ludo safe cells',
    section: 'Game – Ludo',
    itemLabel: 'Cell',
    help: 'Board cell indices marked as safe.',
  },

  // Game — Domino
  {
    key: 'game.domino.playerCount',
    label: 'Domino players',
    section: 'Game – Domino',
    help: 'How many players a Domino match seats.',
  },
  {
    key: 'game.domino.tilesPerPlayer',
    label: 'Domino tiles per player',
    section: 'Game – Domino',
    help: 'Tiles dealt to each player.',
  },
  {
    key: 'game.domino.maxTileValue',
    label: 'Domino max tile value',
    section: 'Game – Domino',
    help: 'Highest value printed on a tile.',
  },

  // Rewards
  {
    key: 'rewards.matchWin.gameCurrency',
    label: 'Match win (game currency)',
    section: 'Rewards',
    help: 'Game currency granted for a match won.',
  },
  {
    key: 'rewards.matchWin.xp',
    label: 'Match win (XP)',
    section: 'Rewards',
    help: 'Experience granted for a match won.',
  },
  {
    key: 'rewards.matchLoss.gameCurrency',
    label: 'Match loss (game currency)',
    section: 'Rewards',
    help: 'Game currency granted for a match lost.',
  },
  {
    key: 'rewards.matchLoss.xp',
    label: 'Match loss (XP)',
    section: 'Rewards',
    help: 'Experience granted for a match lost.',
  },
  {
    key: 'rewards.taskDefault.gameCurrency',
    label: 'Task default (game currency)',
    section: 'Rewards',
    help: 'Default game currency granted by a task.',
  },
  {
    key: 'rewards.dailyLogin',
    label: 'Daily login rewards (game currency)',
    section: 'Rewards',
    itemLabel: 'Day',
    help: 'Ordered amounts — row 1 is login day 1, row 2 is day 2, and so on. Order is significant.',
  },

  // Economy
  {
    key: 'economy.welcomeBonus.gameCurrency',
    label: 'Welcome bonus (game currency)',
    section: 'Economy',
    help: 'Game currency granted as the welcome bonus.',
  },
  {
    key: 'economy.giftDefaultCost',
    label: 'Gift default cost (game currency)',
    section: 'Economy',
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

type ControlKind = 'number' | 'boolean' | 'numberList';

/** Maps the schema's value kind to the editor this surface supports.
 * `string_array` has no editor here and renders read-only. */
function controlKind(schema: ConfigSchemaEntry): ControlKind | null {
  if (schema.kind === 'integer') return 'number';
  if (schema.kind === 'boolean') return 'boolean';
  if (schema.kind === 'integer_array') return 'numberList';
  return null;
}

/** A min===max range (e.g. the fixed active-room limit) offers no choice. */
function isLocked(schema: ConfigSchemaEntry): boolean {
  return schema.min !== null && schema.max !== null && schema.min === schema.max;
}

/** Coerces a `GET /configs` leaf into an editable draft. The response is
 * unvalidated network input, so a value of the wrong type falls back to the
 * schema's compiled default (or an empty input when there is none). List rows
 * are stringified as-is and validated on save. */
function draftOf(field: ConfigField, schema: ConfigSchemaEntry, configs: SystemConfig | null): Draft {
  const value = readConfigValue(configs, field.key);
  const kind = controlKind(schema);
  if (kind === 'boolean') {
    if (typeof value === 'boolean') return value;
    return typeof schema.defaultValue === 'boolean' ? schema.defaultValue : false;
  }
  if (kind === 'numberList') {
    const list: unknown[] = Array.isArray(value)
      ? value
      : (Array.isArray(schema.defaultValue) ? schema.defaultValue : []);
    return list.map((n) => String(n));
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof schema.defaultValue === 'number' && Number.isFinite(schema.defaultValue)
    ? String(schema.defaultValue)
    : '';
}

/** Display form for read-only values, compiled defaults and schema notes. */
function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.length > 0 ? value.map((v) => String(v)).join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value.length > 0) return value;
  return '—';
}

function rangeText(schema: ConfigSchemaEntry): string {
  if (schema.kind === 'boolean') return 'Boolean (true / false)';
  if (schema.kind === 'string_array') return 'Duration strings, e.g. "2h", "30m"';
  const bounds =
    schema.min !== null && schema.max !== null
      ? `${schema.min}–${schema.max}`
      : schema.min !== null
        ? `≥ ${schema.min}`
        : schema.max !== null
          ? `≤ ${schema.max}`
          : 'unbounded';
  return schema.kind === 'integer_array' ? `Each item: ${bounds}` : `Range: ${bounds}`;
}

/** Draft → wire value for POST /configs { key, value }, bounded by the schema.
 * Throws on the first bad field so the save aborts before any write. */
function toWireValue(field: ConfigField, schema: ConfigSchemaEntry, draft: Draft): number | boolean | number[] {
  const kind = controlKind(schema);
  if (kind === 'boolean') {
    if (typeof draft !== 'boolean') throw new Error(`${field.label} must be true or false`);
    return draft;
  }
  if (kind === 'numberList') {
    const rows = Array.isArray(draft) ? draft : [];
    if (rows.length === 0) throw new Error(`${field.label}: add at least one row`);
    return rows.map((row) => {
      if (!/^\d+$/.test(row)) {
        throw new Error(`${field.label}: "${row || '(empty)'}" must be a whole number`);
      }
      const value = Number(row);
      if (!Number.isSafeInteger(value)) throw new Error(`${field.label}: "${row}" is out of range`);
      if (schema.min !== null && value < schema.min) {
        throw new Error(`${field.label} items must be at least ${schema.min}`);
      }
      if (schema.max !== null && value > schema.max) {
        throw new Error(`${field.label} items must be at most ${schema.max}`);
      }
      return value;
    });
  }
  if (typeof draft !== 'string' || !/^\d+$/.test(draft)) {
    throw new Error(`${field.label} must be a whole number`);
  }
  const value = Number(draft);
  if (!Number.isSafeInteger(value)) throw new Error(`${field.label} is out of range`);
  if (schema.min !== null && value < schema.min) {
    throw new Error(`${field.label} must be at least ${schema.min}`);
  }
  if (schema.max !== null && value > schema.max) {
    throw new Error(`${field.label} must be at most ${schema.max}`);
  }
  return value;
}

function ConfigFieldControl({ field, schema, value, onChange, disabled }: {
  field: ConfigField;
  schema: ConfigSchemaEntry;
  value: Draft;
  onChange: (value: Draft) => void;
  disabled: boolean;
}) {
  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
  const kind = controlKind(schema);

  if (kind === 'boolean') {
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

  if (kind === 'numberList') {
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
              min={schema.min ?? undefined}
              max={schema.max ?? undefined}
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

  if (!kind) return null;

  const raw = typeof value === 'string' ? value : '';
  const parsed = /^\d+$/.test(raw) ? Number(raw) : null;
  return (
    <>
      <input
        id={`config-${field.key}`}
        type="number"
        step={1}
        min={schema.min ?? undefined}
        max={schema.max ?? undefined}
        value={raw}
        disabled={disabled}
        aria-label={field.label}
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
  const [search, setSearch] = useState('');

  const schemaQuery = useQuery({
    queryKey: ['configs', 'schema'],
    queryFn: () => configsService.getSchema(),
  });
  const schemaByKey = useMemo(
    () => new Map((schemaQuery.data ?? []).map((entry) => [entry.key, entry])),
    [schemaQuery.data],
  );

  const visibleFields = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return CONFIG_FIELDS;
    return CONFIG_FIELDS.filter(
      (field) =>
        field.key.toLowerCase().includes(query) || field.label.toLowerCase().includes(query),
    );
  }, [search]);

  const currentOf = (field: ConfigField): Draft => {
    const schema = schemaByKey.get(field.key);
    if (!schema) return '';
    return draft[field.key] ?? draftOf(field, schema, configs);
  };
  const setField = (key: string, value: Draft) => setDraft((prev) => ({ ...prev, [key]: value }));

  const changedFields = CONFIG_FIELDS.filter((field) => {
    const schema = schemaByKey.get(field.key);
    if (!schema || !controlKind(schema) || isLocked(schema)) return false;
    const edited = draft[field.key];
    return edited !== undefined && !sameDraft(edited, draftOf(field, schema, configs));
  });

  const save = async () => {
    setSaving(true);
    try {
      for (const field of changedFields) {
        const edited = draft[field.key];
        const schema = schemaByKey.get(field.key);
        if (edited === undefined || !schema) continue;
        await configsService.setConfig(field.key, toWireValue(field, schema, edited));
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search configuration keys…"
            aria-label="Search configuration keys"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>
        {schemaQuery.data && (
          <p className="text-xs text-gray-400">
            {visibleFields.length} / {CONFIG_FIELDS.length} keys · bounds from /configs/schema
          </p>
        )}
      </div>

      <QueryState
        isLoading={schemaQuery.isLoading}
        isError={schemaQuery.isError}
        error={schemaQuery.error}
        isEmpty={visibleFields.length === 0}
        emptyMessage={
          search
            ? 'No configuration keys match your search.'
            : 'No writable configuration keys were returned.'
        }
        onRetry={() => schemaQuery.refetch()}
      >
        {CONFIG_SECTIONS.map((section) => {
          const fields = visibleFields.filter((field) => field.section === section);
          if (fields.length === 0) return null;
          return (
            <Card key={section} className="mb-4">
              <CardHeader><CardTitle>{section}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map((field) => {
                    const schema = schemaByKey.get(field.key);
                    const readOnly = !schema || !controlKind(schema) || isLocked(schema);
                    return (
                      <div key={field.key} className="block text-xs font-medium text-gray-500">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            {field.label}
                          </span>
                          {schema ? (
                            <span
                              title={schema.note ?? (schema.live
                                ? 'Affects runtime — validated and read by a verified consumer.'
                                : 'Stored only — persisted by POST /configs, but no runtime component reads it.')}
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                schema.live
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {schema.live ? 'LIVE' : 'Stored only'}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Not in schema
                            </span>
                          )}
                        </div>

                        {!schema || readOnly ? (
                          <p className="mt-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
                            {formatValue(readConfigValue(configs, field.key) ?? schema?.defaultValue)}
                          </p>
                        ) : (
                          <ConfigFieldControl
                            field={field}
                            schema={schema}
                            value={currentOf(field)}
                            onChange={(value) => setField(field.key, value)}
                            disabled={!canWrite || saving}
                          />
                        )}

                        <span className="mt-0.5 block font-mono text-[10px] text-gray-400">{field.key}</span>
                        {schema ? (
                          <span className="mt-0.5 block text-[11px] text-gray-400">
                            {rangeText(schema)} · Default: {formatValue(schema.defaultValue)}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] text-gray-400">
                            Not present in the writable schema — read-only.
                          </span>
                        )}
                        {schema?.note && (
                          <span className="mt-0.5 block text-[11px] text-amber-600 dark:text-amber-400">
                            {schema.note}
                          </span>
                        )}
                        <span className="mt-1 block text-[11px] font-normal leading-relaxed text-gray-500 dark:text-gray-400">
                          {field.help}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </QueryState>

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
const PROGRESSION_POLICY_TYPES: ProgressionPolicyType[] = ['USER_LEVEL', 'ROOM_LEVEL', 'CHAT_LEVEL'];

function PolicyCenter() {
  const limitsQuery = useQuery({
    queryKey: ['progression-policy', 'limits'],
    queryFn: () => progressionPolicyService.getLimits(),
  });
  const capQueries = useQueries({
    queries: PROGRESSION_POLICY_TYPES.map((policyType) => ({
      queryKey: ['progression-policy', policyType],
      queryFn: () => progressionPolicyService.list(policyType),
    })),
  });
  const levelConfigQuery = useQuery({
    queryKey: ['level-config'],
    queryFn: () => levelConfigService.list(),
  });
  const roomLevelsQuery = useQuery({
    queryKey: ['room-level-policy'],
    queryFn: () => roomLevelPolicyService.list(),
  });
  const micCapacityQuery = useQuery({
    queryKey: ['room-level-policy', 'mic-capacity'],
    queryFn: () => roomLevelPolicyService.micCapacity(),
  });
  const tiersQuery = useQuery({
    queryKey: ['competitive-tier-policies'],
    queryFn: () => competitiveTierPolicyService.list(),
  });

  const capsLoading = limitsQuery.isLoading || capQueries.some((query) => query.isLoading);
  const failedCapQuery = limitsQuery.isError
    ? limitsQuery
    : capQueries.find((query) => query.isError);
  const activeCap = (index: number) =>
    capQueries[index]?.data?.find((policy) => policy.status === 'active') ?? null;
  const effectiveCap = (index: number, policyType: ProgressionPolicyType): number | null =>
    activeCap(index)?.maxLevel ?? limitsQuery.data?.defaults[policyType] ?? null;
  const activeTiers = (tiersQuery.data ?? []).filter((policy) => policy.status === 'ACTIVE');
  const micRows = micCapacityQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Progression caps</CardTitle>
            <Link href="/dashboard/progression" className="text-sm text-indigo-600 hover:underline">
              Manage on Progression →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={capsLoading}
            isError={Boolean(failedCapQuery)}
            error={failedCapQuery?.error}
            isEmpty={false}
            emptyMessage=""
            onRetry={() => {
              limitsQuery.refetch();
              capQueries.forEach((query) => query.refetch());
            }}
          >
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Domain</th>
                  <th className="py-2 pr-3">Effective cap</th>
                  <th className="py-2 pr-3">Active version</th>
                  <th className="py-2 pr-3">Supported range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {PROGRESSION_POLICY_TYPES.map((policyType, index) => {
                  const active = activeCap(index);
                  const fallback = limitsQuery.data?.defaults[policyType];
                  return (
                    <tr key={policyType}>
                      <td className="py-2 pr-3 font-medium">{humanizeToken(policyType)}</td>
                      <td className="py-2 pr-3">
                        {active ? `L${active.maxLevel}` : `${fallback} (compiled default)`}
                      </td>
                      <td className="py-2 pr-3">{active ? `v${active.version}` : '—'}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        1–{limitsQuery.data?.supportedMaxLevel}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              Active policies override the compiled default. Caps are authored and activated on
              Progression.
            </p>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Level curves</CardTitle>
            <Link href="/dashboard/progression" className="text-sm text-indigo-600 hover:underline">
              Managed on Progression →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={levelConfigQuery.isLoading || roomLevelsQuery.isLoading}
            isError={levelConfigQuery.isError || roomLevelsQuery.isError}
            error={levelConfigQuery.isError ? levelConfigQuery.error : roomLevelsQuery.error}
            isEmpty={false}
            emptyMessage=""
            onRetry={() => {
              levelConfigQuery.refetch();
              roomLevelsQuery.refetch();
            }}
          >
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Curve</th>
                  <th className="py-2 pr-3">Configured</th>
                  <th className="py-2 pr-3">Effective cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-3 font-medium">Player levels (level_config)</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {levelConfigQuery.data
                      ? `${levelConfigQuery.data.levels.length} rows · L${levelConfigQuery.data.maxLevel}`
                      : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {effectiveCap(0, 'USER_LEVEL') !== null
                      ? `L${effectiveCap(0, 'USER_LEVEL')}`
                      : '—'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium">Room levels (room_level_policy)</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    {roomLevelsQuery.data ? `${roomLevelsQuery.data.length} rows` : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {effectiveCap(1, 'ROOM_LEVEL') !== null
                      ? `L${effectiveCap(1, 'ROOM_LEVEL')}`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Microphone capacity</CardTitle>
            <Link href="/dashboard/progression" className="text-sm text-indigo-600 hover:underline">
              Manage on Progression →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Default slots</p>
              <p className="text-lg font-semibold">
                {limitsQuery.data ? limitsQuery.data.roomMic.defaultSlots : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500">Technical ceiling</p>
              <p className="text-lg font-semibold">
                {limitsQuery.data ? limitsQuery.data.roomMic.maxSlots : '—'}
              </p>
            </div>
          </div>
          <QueryState
            isLoading={micCapacityQuery.isLoading}
            isError={micCapacityQuery.isError}
            error={micCapacityQuery.error}
            isEmpty={micRows.length === 0}
            emptyMessage="All active rooms are within their microphone capacity."
            onRetry={() => micCapacityQuery.refetch()}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Room</th>
                    <th className="py-2 pr-3">Level</th>
                    <th className="py-2 pr-3">Capacity</th>
                    <th className="py-2 pr-3">Occupied</th>
                    <th className="py-2 pr-3">Surplus</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {micRows.map((row) => (
                    <tr key={row.roomId}>
                      <td className="py-2 pr-3">
                        <p className="text-xs font-medium">
                          {row.name?.en || row.name?.ar || row.roomId}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400">{row.roomId}</p>
                      </td>
                      <td className="py-2 pr-3">L{row.level}</td>
                      <td className="py-2 pr-3">{row.capacity}</td>
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
          <p className="text-xs text-gray-400">
            Capacity reductions never evict occupants; over-capacity rooms converge as members leave.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Competitive tiers</CardTitle>
            <Link href="/dashboard/meta-game" className="text-sm text-indigo-600 hover:underline">
              Open Meta-Game →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={tiersQuery.isLoading}
            isError={tiersQuery.isError}
            error={tiersQuery.error}
            isEmpty={activeTiers.length === 0}
            emptyMessage="No active competitive tier policy."
            onRetry={() => tiersQuery.refetch()}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Scope</th>
                    <th className="py-2 pr-3">Version</th>
                    <th className="py-2 pr-3">Effective from</th>
                    <th className="py-2">Tier thresholds</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {activeTiers.map((policy) => (
                    <tr key={policy.id}>
                      <td className="py-2 pr-3 font-medium">{humanizeToken(policy.scopeKey)}</td>
                      <td className="py-2 pr-3">v{policy.version}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">
                        {new Date(policy.effectiveFrom).toLocaleString()}
                      </td>
                      <td className="py-2 text-xs text-gray-500">
                        {[...policy.tiers]
                          .sort((a, b) => a.minRating - b.minRating)
                          .map((tier) => `${tier.code} ≥ ${tier.minRating}`)
                          .join(' · ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </QueryState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Managed elsewhere</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Policy</th>
                  <th className="py-2 pr-3">Owning surface</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="py-2 pr-3 font-medium">Gift policies</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">Gifts domain</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    Context-versioned gift policy authority. The Admin read/list API is not exposed
                    yet, so the catalog is the domain entry point.
                  </td>
                  <td className="py-2 text-right">
                    <Link href="/dashboard/gifts" className="text-sm text-indigo-600 hover:underline">Manage →</Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium">Campaigns</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">Campaign admin</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    Scheduling, eligibility and lifecycle. References real RuleDefinition IDs only.
                  </td>
                  <td className="py-2 text-right">
                    <Link href="/dashboard/campaigns" className="text-sm text-indigo-600 hover:underline">Manage →</Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium">System ranks</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">Rank definitions</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    Manually assigned platform-wide badges; the API has create, update, assign and
                    revoke but no delete.
                  </td>
                  <td className="py-2 text-right">
                    <Link href="/dashboard/ranks" className="text-sm text-indigo-600 hover:underline">Manage →</Link>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium">Progression tracks</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">Track authoring</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">
                    Versioned thresholds with explicit publish; published versions are immutable.
                  </td>
                  <td className="py-2 text-right">
                    <Link href="/dashboard/progression-tracks" className="text-sm text-indigo-600 hover:underline">Manage →</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400">
        Each policy is owned by its canonical backend domain — versioning, audit, activation and cache
        invalidation are enforced by that authority, never by this page. Financial records stay under
        Reports/Reconciliation.
      </p>
    </div>
  );
}
