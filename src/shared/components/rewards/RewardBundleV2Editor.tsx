'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Zap, Coins, Package, Award, Bell, Radio, AlertTriangle, CheckCircle2, Loader2, Boxes, Ticket } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Select } from '@/shared/components/ui/Select';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { ItemBadgePicker } from './ItemBadgePicker';
import { BadgePicker } from './BadgePicker';
import { StoreBundlePicker } from './StoreBundlePicker';
import { VoucherDefinitionPicker } from './VoucherDefinitionPicker';
import rewardBundlesService from '@/services/reward-bundles.service';
import {
  type RewardBundleV2, type RewardComponent, type RewardComponentType,
  REWARD_COMPONENT_TYPES, emptyRewardBundle, validateRewardBundleClientSide,
} from '@/types/rules';

const TYPE_META: Record<RewardComponentType, { label: string; icon: typeof Zap; color: string }> = {
  XP: { label: 'XP', icon: Zap, color: 'text-amber-500' },
  GAME_CURRENCY: { label: 'Game Currency', icon: Coins, color: 'text-yellow-500' },
  ITEM: { label: 'Item', icon: Package, color: 'text-blue-500' },
  BADGE: { label: 'Badge', icon: Award, color: 'text-violet-500' },
  BUNDLE: { label: 'Store Bundle', icon: Boxes, color: 'text-cyan-500' },
  NOTIFICATION: { label: 'Notification', icon: Bell, color: 'text-emerald-500' },
  INTERNAL_EVENT: { label: 'Internal Event', icon: Radio, color: 'text-gray-500' },
  VOUCHER: { label: 'Voucher', icon: Ticket, color: 'text-fuchsia-500' },
};

function genComponentId(type: RewardComponentType): string {
  return `${type.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultComponent(type: RewardComponentType): RewardComponent {
  const id = genComponentId(type);
  switch (type) {
    case 'XP': return { id, type, amount: 100 };
    case 'GAME_CURRENCY': return { id, type, amount: '100' };
    case 'ITEM': return { id, type, itemId: '', quantity: 1 };
    case 'BADGE': return { id, type, badgeId: '', quantity: 1 };
    case 'BUNDLE': return { id, type, bundleId: '' };
    case 'NOTIFICATION': return { id, type, notificationType: 'reward.granted', title: '', message: '' };
    case 'INTERNAL_EVENT': return { id, type, eventType: '', payload: {} };
    case 'VOUCHER': return { id, type, definitionKey: '', quantity: 1 };
  }
}

interface RewardBundleV2EditorProps {
  value: RewardBundleV2 | null | undefined;
  onChange: (bundle: RewardBundleV2) => void;
  disabled?: boolean;
}

/**
 * THE single shared Reward Bundle V2 editor — reused by Rules/Achievements/Tasks/
 * Campaigns/Player Levels/Room Levels/Progression Tracks. Do not build a second one.
 * Supports the complete backend component contract, including Store bundles
 * and Voucher definitions, from reward-bundle.contract.ts.
 */
export function RewardBundleV2Editor({ value, onChange, disabled }: RewardBundleV2EditorProps) {
  const bundle = value ?? emptyRewardBundle();
  const [addType, setAddType] = useState<RewardComponentType>('XP');
  const [serverErrors, setServerErrors] = useState<Array<{ componentId?: string; field?: string; message: string }> | null>(null);
  const [validating, setValidating] = useState(false);
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  const clientErrors = useMemo(() => validateRewardBundleClientSide(bundle), [bundle]);

  function update(components: RewardComponent[]) {
    setServerValid(null);
    setServerErrors(null);
    onChange({ version: 2, components });
  }

  function addComponent() {
    update([...bundle.components, defaultComponent(addType)]);
  }

  function removeComponent(id: string) {
    update(bundle.components.filter((c) => c.id !== id));
  }

  function updateComponent(id: string, patch: Partial<RewardComponent>) {
    update(bundle.components.map((c) => (c.id === id ? { ...c, ...patch } as RewardComponent : c)));
  }

  async function validateWithBackend() {
    setValidating(true);
    setServerErrors(null);
    try {
      const result = await rewardBundlesService.validate(bundle);
      setServerValid(result.valid);
      setServerErrors(result.errors ?? null);
    } catch {
      setServerValid(false);
      setServerErrors([{ message: 'Validation request failed — backend unreachable or endpoint rejected the request.' }]);
    } finally {
      setValidating(false);
    }
  }

  const errorsForComponent = (id: string) => serverErrors?.filter((e) => e.componentId === id) ?? [];

  return (
    <div className="space-y-3">
      {bundle.components.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          No reward components yet. Add one below.
        </p>
      )}

      {bundle.components.map((component) => {
        const meta = TYPE_META[component.type];
        const Icon = meta.icon;
        const compErrors = errorsForComponent(component.id);
        return (
          <div key={component.id} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                <code className="text-[10px] text-gray-400">{component.id}</code>
              </div>
              {!disabled && (
                <button type="button" onClick={() => removeComponent(component.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {component.type === 'XP' && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" label="Amount" min={1} disabled={disabled}
                  value={component.amount}
                  onChange={(e) => updateComponent(component.id, { amount: Number(e.target.value) })} />
                <Input label="Target track (optional)" placeholder="PLAYER_LEVEL / ROOM_LEVEL" disabled={disabled}
                  value={component.targetTrack ?? ''}
                  onChange={(e) => updateComponent(component.id, { targetTrack: e.target.value || undefined })} />
              </div>
            )}

            {component.type === 'GAME_CURRENCY' && (
              <Input label="Amount (GAME_CURRENCY, positive integer string)" placeholder="e.g. 500" disabled={disabled}
                value={component.amount}
                onChange={(e) => updateComponent(component.id, { amount: e.target.value.replace(/[^0-9]/g, '') })} />
            )}

            {component.type === 'ITEM' && (
              <div className="grid grid-cols-[1fr_100px] gap-2 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item</label>
                  <ItemBadgePicker disabled={disabled} value={component.itemId}
                    onChange={(id) => updateComponent(component.id, { itemId: id })} />
                </div>
                <Input type="number" label="Qty" min={1} max={10000} disabled={disabled}
                  value={component.quantity}
                  onChange={(e) => updateComponent(component.id, { quantity: Number(e.target.value) })} />
              </div>
            )}

            {component.type === 'BADGE' && (
              <div className="grid grid-cols-[1fr_100px] gap-2 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Badge</label>
                  <BadgePicker disabled={disabled} value={component.badgeId}
                    onChange={(id) => updateComponent(component.id, { badgeId: id })} />
                </div>
                <Input type="number" label="Qty" min={1} max={10000} disabled={disabled}
                  value={component.quantity ?? 1}
                  onChange={(e) => updateComponent(component.id, { quantity: Number(e.target.value) })} />
              </div>
            )}

            {component.type === 'BUNDLE' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Store bundle
                </label>
                <StoreBundlePicker
                  disabled={disabled}
                  value={component.bundleId}
                  onChange={(bundleId) =>
                    updateComponent(component.id, { bundleId })
                  }
                />
              </div>
            )}

            {component.type === 'NOTIFICATION' && (
              <div className="grid grid-cols-1 gap-2">
                <Input label="Notification type" disabled={disabled} value={component.notificationType}
                  onChange={(e) => updateComponent(component.id, { notificationType: e.target.value })} />
                <Input label="Title (optional)" disabled={disabled} value={component.title ?? ''}
                  onChange={(e) => updateComponent(component.id, { title: e.target.value || undefined })} />
                <Input label="Message (optional)" disabled={disabled} value={component.message ?? ''}
                  onChange={(e) => updateComponent(component.id, { message: e.target.value || undefined })} />
              </div>
            )}

            {component.type === 'INTERNAL_EVENT' && (
              <div className="grid grid-cols-1 gap-2">
                <Input label="Event type" disabled={disabled} value={component.eventType}
                  onChange={(e) => updateComponent(component.id, { eventType: e.target.value })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payload (JSON object, optional, max 1KB)</label>
                  <textarea
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-gray-100"
                    rows={3}
                    defaultValue={JSON.stringify(component.payload ?? {}, null, 2)}
                    onBlur={(e) => {
                      try {
                        const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : {};
                        updateComponent(component.id, { payload: parsed });
                      } catch {
                        // leave previous value on parse failure — surfaced by client validation, not silently accepted
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {component.type === 'VOUCHER' && (
              <div className="grid grid-cols-[1fr_100px] items-end gap-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Voucher definition
                  </label>
                  <VoucherDefinitionPicker
                    disabled={disabled}
                    value={component.definitionKey}
                    onChange={(definitionKey) =>
                      updateComponent(component.id, { definitionKey })
                    }
                  />
                </div>
                <Input
                  type="number"
                  label="Qty"
                  min={1}
                  max={10000}
                  disabled={disabled}
                  value={component.quantity ?? 1}
                  onChange={(event) =>
                    updateComponent(component.id, {
                      quantity: Number(event.target.value),
                    })
                  }
                />
              </div>
            )}

            {compErrors.map((e, i) => (
              <p key={i} className="text-xs text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {e.field ? `${e.field}: ` : ''}{e.message}
              </p>
            ))}
          </div>
        );
      })}

      {!disabled && (
        <div className="flex items-center gap-2 pt-1">
          <Select
            className="w-48"
            value={addType}
            onChange={(e) => setAddType(e.target.value as RewardComponentType)}
            options={REWARD_COMPONENT_TYPES.map((t) => ({ value: t, label: TYPE_META[t].label }))}
          />
          <Button type="button" variant="outline" size="sm" onClick={addComponent}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add component
          </Button>
        </div>
      )}

      {clientErrors.length > 0 && (
        <div className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
          {clientErrors.map((e, i) => <p key={i} className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {e}</p>)}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={validateWithBackend} disabled={validating || bundle.components.length === 0}>
          {validating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
          Validate with backend
        </Button>
        {serverValid === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Backend-validated
          </span>
        )}
        {serverValid === false && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Backend rejected this bundle
          </span>
        )}
      </div>
    </div>
  );
}

export default RewardBundleV2Editor;
