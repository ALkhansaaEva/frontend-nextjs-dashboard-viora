'use client';

import { useId } from 'react';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ItemBadgePicker } from './ItemBadgePicker';
import { BadgePicker } from './BadgePicker';
import { RuleRefPicker, CampaignRefPicker } from '@/shared/components/rules/RefPicker';
import type { RuleNodeFieldSchema } from '@/types/rules';

interface NodeConfigFormProps {
  schema: RuleNodeFieldSchema[];
  value: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  disabled?: boolean;
  /** Backend descriptor.eventContext — selectable payload paths. */
  eventContext?: readonly string[];
  /** Backend-derived gameplay event types (from the Node Registry triggers). */
  eventTypeOptions?: string[];
  /** Backend game catalog gameType values. */
  gameTypeOptions?: string[];
}

/**
 * Renders a Node's configuration form ENTIRELY from the backend-provided
 * `configSchema` (GET /admin/rules/nodes) — no hardcoded per-node-type frontend
 * catalog. New node types the backend registers appear here automatically.
 */
export function NodeConfigForm({ schema, value, onChange, disabled, eventContext, eventTypeOptions, gameTypeOptions }: NodeConfigFormProps) {
  const listId = useId();
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  const visible = schema.filter((field) => {
    if (!field.visibleWhen) return true;
    return value[field.visibleWhen.field] === field.visibleWhen.equals;
  });

  if (visible.length === 0) {
    return <p className="text-xs text-gray-400 italic">No configuration fields for this node.</p>;
  }

  return (
    // This form lives inside the narrow Inspector rail. Viewport-based
    // `sm:grid-cols-2` made each control roughly 100px wide on desktop and
    // visually hid real registry inputs. Keep one production-readable column.
    <div className="grid grid-cols-1 gap-3">
      {visible.map((field) => {
        const label = field.required ? `${field.label} *` : field.label;
        const current = value[field.key];

        switch (field.type) {
          case 'BOOLEAN':
            return (
              <label key={field.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" disabled={disabled || field.readOnly}
                  checked={Boolean(current)} onChange={(e) => set(field.key, e.target.checked)} />
                {label}
              </label>
            );

          case 'ENUM':
            return (
              <Select key={field.key} label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
                options={[{ value: '', label: '—' }, ...(field.enumValues ?? []).map((v) => ({ value: v, label: v }))]}
              />
            );

          case 'MULTI_ENUM': {
            const selected = Array.isArray(current) ? (current as string[]) : [];
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <div className="flex flex-wrap gap-1.5">
                  {(field.enumValues ?? []).map((v) => {
                    const active = selected.includes(v);
                    return (
                      <button key={v} type="button" disabled={disabled || field.readOnly}
                        onClick={() => set(field.key, active ? selected.filter((s) => s !== v) : [...selected, v])}
                        className={`text-xs px-2 py-1 rounded-full border ${active
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          case 'INTEGER':
            return (
              <Input key={field.key} type="number" label={label} disabled={disabled || field.readOnly}
                min={field.minimum} max={field.maximum} step={1}
                value={typeof current === 'number' ? current : (current as string) ?? ''}
                onChange={(e) => set(field.key, e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))}
              />
            );

          case 'BIGINT':
            // String-safe: never coerce through Number for large magnitudes.
            return (
              <Input key={field.key} label={label} disabled={disabled || field.readOnly}
                inputMode="numeric" placeholder="Integer (any size)"
                value={typeof current === 'string' ? current : current == null ? '' : String(current)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === '') return set(field.key, '');
                  if (/^-?[0-9]+$/.test(raw)) set(field.key, raw);
                }}
              />
            );

          case 'DATE':
            return (
              <Input key={field.key} type="date" label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            );

          case 'DATETIME':
            return (
              <Input key={field.key} type="datetime-local" label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            );

          case 'ITEM_REFERENCE':
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <ItemBadgePicker disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)}
                />
              </div>
            );

          case 'BADGE_REFERENCE':
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <BadgePicker disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)}
                />
              </div>
            );

          case 'PAYLOAD_PATH':
            // Primary: pick from backend descriptor.eventContext. Manual entry
            // stays possible (datalist) for paths the descriptor may not list.
            return (
              <div key={field.key}>
                <Input key={field.key} label={label} disabled={disabled || field.readOnly}
                  list={`${listId}-${field.key}`}
                  placeholder={field.description ?? 'payload.…'}
                  maxLength={field.maxLength} pattern={field.pattern}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(e) => set(field.key, e.target.value)}
                />
                <datalist id={`${listId}-${field.key}`}>
                  {(eventContext ?? []).map((path) => (
                    <option key={path} value={path} />
                  ))}
                </datalist>
              </div>
            );

          case 'EVENT_TYPE':
            return eventTypeOptions && eventTypeOptions.length ? (
              <Select key={field.key} label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
                options={[
                  ...(field.required ? [] : [{ value: '', label: '— any event —' }]),
                  ...eventTypeOptions.map((t) => ({ value: t, label: t })),
                ]}
              />
            ) : (
              <Input key={field.key} label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            );

          case 'GAME_TYPE':
            return gameTypeOptions && gameTypeOptions.length ? (
              <Select key={field.key} label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
                options={gameTypeOptions.map((t) => ({ value: t, label: t }))}
              />
            ) : (
              <Input key={field.key} label={label} disabled={disabled || field.readOnly}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            );

          case 'TASK_REFERENCE':
            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <RuleRefPicker kind="TASK" disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)} />
              </div>
            );

          case 'ACHIEVEMENT_REFERENCE':
            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <RuleRefPicker kind="ACHIEVEMENT" disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)} />
              </div>
            );

          case 'CAMPAIGN_REFERENCE':
            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
                <CampaignRefPicker disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)} />
              </div>
            );

          case 'STRING':
          case 'DURATION':
          default:
            return (
              <Input key={field.key} label={label} disabled={disabled || field.readOnly}
                placeholder={field.description}
                maxLength={field.maxLength} pattern={field.pattern}
                value={typeof current === 'string' ? current : ''}
                onChange={(e) => set(field.key, e.target.value)}
              />
            );
        }
      })}
    </div>
  );
}

export default NodeConfigForm;
