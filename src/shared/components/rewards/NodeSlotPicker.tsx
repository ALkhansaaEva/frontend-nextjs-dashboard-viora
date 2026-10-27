'use client';

import { Select } from '@/shared/components/ui/Select';
import { NodeConfigForm } from './NodeConfigForm';
import type { NodeRegistryResponse, RuleNodeDescriptor } from '@/types/rules';

export function nodesInCategory(registry: NodeRegistryResponse | undefined, category: RuleNodeDescriptor['category']) {
  if (!registry) return [] as Array<[string, RuleNodeDescriptor]>;
  return Object.entries(registry).filter(([, d]) => d.category === category);
}

/**
 * Reusable node-type picker + backend-driven config form for one graph "slot"
 * (a single trigger, a single counter, one of several conditions, …). Shared by
 * the Rule Engine, Achievements, and Task admin pages — do not duplicate this.
 */
export function NodeSlotPicker({
  label, registry, category, value, onChange, allowClear,
}: {
  label: string;
  registry: NodeRegistryResponse | undefined;
  category: RuleNodeDescriptor['category'];
  value: { type: string; config: Record<string, unknown> } | null;
  onChange: (v: { type: string; config: Record<string, unknown> } | null) => void;
  allowClear?: boolean;
}) {
  const options = nodesInCategory(registry, category);
  const descriptor = value ? registry?.[value.type] : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {allowClear && value && (
          <button type="button" onClick={() => onChange(null)} className="text-xs text-gray-400 hover:text-red-500">clear</button>
        )}
      </div>
      <Select
        value={value?.type ?? ''}
        onChange={(e) => {
          const type = e.target.value;
          onChange(type ? { type, config: {} } : null);
        }}
        options={[{ value: '', label: allowClear ? '— none —' : '— select —' }, ...options.map(([type, d]) => ({ value: type, label: `${d.label} (${type})` }))]}
      />
      {descriptor && (
        <div className="pl-3 border-l-2 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-2">{descriptor.description}</p>
          <NodeConfigForm schema={descriptor.configSchema} value={value!.config} onChange={(config) => onChange({ type: value!.type, config })} />
        </div>
      )}
    </div>
  );
}

export default NodeSlotPicker;
