/**
 * Presentation-only metadata for the rule node kinds.
 *
 * Everything ABOUT a specific node type — its label, description, category,
 * config fields, reward fields, ports, and what event it consumes — comes
 * from the backend's own RuleNodeDescriptor (GET /admin/rules/nodes). This
 * file only supplies the visual language (colours, ordering) shared across
 * every node of a given kind. It must never invent a node's fields; see
 * NodeInspector.tsx, which renders directly from the descriptor.
 *
 * Ported from the visual Rule Builder prototype (viora-admin-dashboard-modernize-0642fe)
 * and adjusted to import from the canonical V2 contract module (`@/types/rules`).
 */
import type { RuleNodeKind } from '@/types/rules';

export interface RuleNodeKindMeta {
  kind: RuleNodeKind;
  label: string;
  labelAr: string;
  description: string;
  chipClass: string;
  borderClass: string;
}

export const NODE_KIND_META: Record<RuleNodeKind, RuleNodeKindMeta> = {
  trigger: {
    kind: 'trigger',
    label: 'Triggers',
    labelAr: 'المشغلات',
    description: 'Entry points. A rule needs at least one trigger.',
    chipClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
    borderClass: 'border-emerald-500/40',
  },
  condition: {
    kind: 'condition',
    label: 'Conditions',
    labelAr: 'الشروط',
    description: 'Boolean tests evaluated against the event.',
    chipClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/30',
    borderClass: 'border-sky-500/40',
  },
  logic: {
    kind: 'logic',
    label: 'Logic',
    labelAr: 'المنطق',
    description: 'Combine boolean inputs.',
    chipClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/30',
    borderClass: 'border-violet-500/40',
  },
  counter: {
    kind: 'counter',
    label: 'Counters',
    labelAr: 'العدادات',
    description: 'Accumulate progress. At most one accumulator per rule.',
    chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/30',
    borderClass: 'border-amber-500/40',
  },
  aggregation: {
    kind: 'aggregation',
    label: 'Aggregation',
    labelAr: 'التجميع',
    description: 'Aggregate a payload value. Counts as the accumulator.',
    chipClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/30',
    borderClass: 'border-orange-500/40',
  },
  window: {
    kind: 'window',
    label: 'Windows',
    labelAr: 'النوافذ',
    description: 'Scope the counter in time. At most one window per rule.',
    chipClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/30',
    borderClass: 'border-cyan-500/40',
  },
  action: {
    kind: 'action',
    label: 'Actions',
    labelAr: 'الإجراءات',
    description: 'What the rule does when it matches.',
    chipClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/30',
    borderClass: 'border-rose-500/40',
  },
};

export const NODE_KIND_ORDER: RuleNodeKind[] = [
  'trigger', 'condition', 'logic', 'counter', 'aggregation', 'window', 'action',
];

/**
 * Action types the backend registers but does not dispatch at runtime.
 *
 * Kept as an (empty) set, not deleted, so a future backend regression has an
 * obvious place to be flagged again. Verified empty against
 * RuleActionDispatcherService.dispatch() / RuleWorkerService.executeActions()
 * as of this migration — every registered action type has real runtime
 * execution (GrantXP/GrantItem/GrantBadge/EmitNotification/EmitInternalEvent
 * via outbox, GrantGAME_CURRENCY inline through the wallet).
 */
export const NO_OP_ACTION_TYPES = new Set<string>([]);

/** Last-resort label for a node type absent from the backend registry response. */
export function humaniseNodeType(type: string): string {
  if (/^[A-Z0-9_]+$/.test(type)) {
    return type
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
  return type
    .replace(/^On(?=[A-Z])/, 'On ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
}
