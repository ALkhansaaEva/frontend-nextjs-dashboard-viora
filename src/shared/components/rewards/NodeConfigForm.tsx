'use client';

import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { ItemBadgePicker } from './ItemBadgePicker';
import type { RuleNodeFieldSchema } from '@/types/rules';

interface NodeConfigFormProps {
  schema: RuleNodeFieldSchema[];
  value: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Renders a Node's configuration form ENTIRELY from the backend-provided
 * `configSchema` (GET /admin/rules/nodes) — no hardcoded per-node-type frontend
 * catalog. New node types the backend registers appear here automatically.
 */
export function NodeConfigForm({ schema, value, onChange, disabled }: NodeConfigFormProps) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  const visible = schema.filter((field) => {
    if (!field.visibleWhen) return true;
    return value[field.visibleWhen.field] === field.visibleWhen.equals;
  });

  if (visible.length === 0) {
    return <p className="text-xs text-gray-400 italic">No configuration fields for this node.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          case 'BIGINT':
            return (
              <Input key={field.key} type="number" label={label} disabled={disabled || field.readOnly}
                min={field.minimum} max={field.maximum}
                value={typeof current === 'number' ? current : (current as string) ?? ''}
                onChange={(e) => set(field.key, field.type === 'BIGINT' ? e.target.value : Number(e.target.value))}
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
          case 'BADGE_REFERENCE':
            return (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <ItemBadgePicker mode={field.type === 'BADGE_REFERENCE' ? 'BADGE' : 'ITEM'} disabled={disabled || field.readOnly}
                  value={typeof current === 'string' ? current : ''}
                  onChange={(v) => set(field.key, v)}
                />
              </div>
            );

          case 'STRING':
          case 'DURATION':
          case 'PAYLOAD_PATH':
          case 'EVENT_TYPE':
          case 'GAME_TYPE':
          case 'TASK_REFERENCE':
          case 'ACHIEVEMENT_REFERENCE':
          case 'CAMPAIGN_REFERENCE':
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
