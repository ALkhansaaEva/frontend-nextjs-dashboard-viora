/**
 * Rule Engine / Node Registry / Reward Bundle V2 — canonical backend contract types.
 *
 * Ported verbatim (field-for-field) from the backend source, NOT invented:
 * - src/modules/gameplay-events/contracts/gameplay-event.contract.ts
 * - src/modules/gameplay-events/entities/rule-definition.entity.ts
 * - src/modules/gameplay-events/rule-admin.controller.ts
 * - src/modules/game/rewards/reward-bundle.contract.ts
 *
 * IMPORTANT BACKEND GAP (verified by direct source read, not just the audit doc):
 * RuleAdminController exposes NO `GET /admin/rules` (list) and NO `GET /admin/rules/:id`
 * (detail) endpoint — only POST create/validate/preview/publish/disable/rollback and
 * GET nodes. RuleDefinitionService has no list/find method either. There is currently
 * no way to browse previously-created rules through any API. The Rule Admin UI must not
 * fabricate a list — it tracks rules created in the current session and requires a
 * definitionKey/version (or id) to act on anything created earlier.
 */

// ── Reward Bundle V2 (verbatim from reward-bundle.contract.ts) ──────────────

export const REWARD_BUNDLE_VERSION = 2 as const;
export const MAX_REWARD_COMPONENTS = 20;
export const MAX_REWARD_COMPONENT_ID_LENGTH = 64;
export const MAX_REWARD_INTERNAL_EVENT_PAYLOAD_BYTES = 1_024;

export type RewardComponentType =
  'XP' | 'GAME_CURRENCY' | 'ITEM' | 'BADGE' | 'NOTIFICATION' | 'INTERNAL_EVENT';

export const REWARD_COMPONENT_TYPES: readonly RewardComponentType[] = [
  'XP', 'GAME_CURRENCY', 'ITEM', 'BADGE', 'NOTIFICATION', 'INTERNAL_EVENT',
];

export type RewardComponentStatus =
  | 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';

export interface XpRewardComponent { id: string; type: 'XP'; amount: number; targetTrack?: string }
export interface GameCurrencyRewardComponent { id: string; type: 'GAME_CURRENCY'; amount: string }
export interface ItemRewardComponent { id: string; type: 'ITEM'; itemId: string; quantity: number }
export interface BadgeRewardComponent { id: string; type: 'BADGE'; badgeId: string; quantity?: number }
export interface NotificationRewardComponent {
  id: string; type: 'NOTIFICATION'; notificationType: string; title?: string; message?: string;
}
export interface InternalEventRewardComponent {
  id: string; type: 'INTERNAL_EVENT'; eventType: string; payload?: Record<string, unknown>;
}

export type RewardComponent =
  | XpRewardComponent | GameCurrencyRewardComponent | ItemRewardComponent
  | BadgeRewardComponent | NotificationRewardComponent | InternalEventRewardComponent;

export interface RewardBundleV2 {
  version: 2;
  components: RewardComponent[];
}

export const REWARD_ACTION_TYPES: Record<RewardComponentType, string> = {
  XP: 'GrantXP',
  GAME_CURRENCY: 'GrantGAME_CURRENCY',
  ITEM: 'GrantItem',
  BADGE: 'GrantBadge',
  NOTIFICATION: 'EmitNotification',
  INTERNAL_EVENT: 'EmitInternalEvent',
};

export function emptyRewardBundle(): RewardBundleV2 {
  return { version: 2, components: [] };
}

/**
 * Client-side pre-flight validation mirroring the backend's `validateRewardBundle`
 * (game/rewards/reward-bundle.contract.ts) for immediate UX feedback. The backend's
 * `POST /admin/reward-bundles/validate` remains the authoritative check — this never
 * replaces it, it only avoids a round-trip for obviously-invalid input.
 */
export function validateRewardBundleClientSide(bundle: RewardBundleV2): string[] {
  const errors: string[] = [];
  if (bundle.version !== REWARD_BUNDLE_VERSION) errors.push(`version must be ${REWARD_BUNDLE_VERSION}`);
  if (bundle.components.length > MAX_REWARD_COMPONENTS) {
    errors.push(`at most ${MAX_REWARD_COMPONENTS} components allowed`);
  }
  const seen = new Set<string>();
  bundle.components.forEach((c, i) => {
    const label = `component[${i}]`;
    if (!c.id || c.id.length > MAX_REWARD_COMPONENT_ID_LENGTH) errors.push(`${label}.id invalid`);
    else if (seen.has(c.id)) errors.push(`${label}.id "${c.id}" is duplicated`);
    else seen.add(c.id);
    switch (c.type) {
      case 'XP':
        if (!Number.isSafeInteger(c.amount) || c.amount <= 0) errors.push(`${label}.amount must be a positive integer`);
        break;
      case 'GAME_CURRENCY':
        if (!/^[1-9][0-9]*$/.test(c.amount)) errors.push(`${label}.amount must be a positive integer string`);
        break;
      case 'ITEM':
        if (!c.itemId) errors.push(`${label}.itemId is required`);
        if (!Number.isSafeInteger(c.quantity) || c.quantity < 1 || c.quantity > 10_000) errors.push(`${label}.quantity must be 1..10000`);
        break;
      case 'BADGE':
        if (!c.badgeId) errors.push(`${label}.badgeId is required`);
        break;
      case 'NOTIFICATION':
        if (!c.notificationType) errors.push(`${label}.notificationType is required`);
        break;
      case 'INTERNAL_EVENT':
        if (!c.eventType) errors.push(`${label}.eventType is required`);
        break;
    }
  });
  return errors;
}

// ── Node Registry (verbatim from gameplay-event.contract.ts) ────────────────

export type RuleNodeKind = 'trigger' | 'condition' | 'logic' | 'counter' | 'aggregation' | 'window' | 'action';

export type RulePortDataType = 'BOOLEAN' | 'NUMBER' | 'EVENT_CONTEXT' | 'WINDOW_CONTEXT' | 'ACTION_FLOW';

export type RuleNodeFieldType =
  | 'STRING' | 'INTEGER' | 'BIGINT' | 'BOOLEAN' | 'ENUM' | 'MULTI_ENUM' | 'DATE' | 'DATETIME'
  | 'DURATION' | 'PAYLOAD_PATH' | 'EVENT_TYPE' | 'GAME_TYPE' | 'ITEM_REFERENCE' | 'TASK_REFERENCE'
  | 'ACHIEVEMENT_REFERENCE' | 'CAMPAIGN_REFERENCE' | 'BADGE_REFERENCE';

export interface RuleNodeFieldSchema {
  key: string;
  label: string;
  description?: string;
  type: RuleNodeFieldType;
  required?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  entityType?: string;
  visibleWhen?: { field: string; equals: unknown };
  readOnly?: boolean;
}

export interface RuleNodePort {
  key: string;
  dataType: RulePortDataType;
  required?: boolean;
  description?: string;
}

export interface RuleNodeDescriptor {
  kind: RuleNodeKind;
  output: 'boolean' | 'number' | 'window' | 'action';
  minimumInputs: number;
  maximumInputs: number;
  label: string;
  description: string;
  category: 'TRIGGER' | 'CONDITION' | 'LOGIC' | 'COUNTER' | 'AGGREGATION' | 'WINDOW' | 'ACTION';
  inputs: RuleNodePort[];
  outputs: RuleNodePort[];
  configSchema: RuleNodeFieldSchema[];
  eventContext?: string[];
  consumesEvent?: string;
  rewardSchema?: RuleNodeFieldSchema[];
  runtime?: string;
  deprecated?: boolean;
  aliasOf?: string;
  replacement?: string;
}

/** GET /admin/rules/nodes response shape — a dict keyed by node type name, not an array. */
export type NodeRegistryResponse = Readonly<Record<string, RuleNodeDescriptor>>;

// ── Rule Graph ────────────────────────────────────────────────────────────

export interface RuleNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

export interface RuleGraph {
  nodes: RuleNode[];
  edges: Array<{ from: string; to: string }>;
}

export type RuleCompilationErrorCode =
  | 'RULE_INVALID_GRAPH' | 'RULE_UNKNOWN_NODE' | 'RULE_DUPLICATE_NODE_ID' | 'RULE_INVALID_NODE_ID'
  | 'RULE_CONFIG_TOO_LARGE' | 'RULE_NODE_LIMIT' | 'RULE_INVALID_CONNECTION' | 'RULE_FAN_OUT_LIMIT'
  | 'RULE_CYCLE' | 'RULE_MISSING_TRIGGER' | 'RULE_MISSING_ACTION' | 'RULE_UNREACHABLE_NODE'
  | 'RULE_REQUIRED_FIELD' | 'RULE_INVALID_RANGE' | 'RULE_INVALID_VALUE' | 'RULE_INVALID_EVENT'
  | 'RULE_INVALID_WINDOW' | 'RULE_INVALID_REWARD';

export interface RuleCompilationError {
  code: RuleCompilationErrorCode;
  nodeId?: string;
  field?: string;
  message: string;
  severity: 'ERROR';
}

export interface RuleGraphValidationResult {
  valid: boolean;
  errors: RuleCompilationError[];
  compilerVersion: string;
  compiledVersion?: number;
  graphHash?: string;
  nodeCount?: number;
  edgeCount?: number;
  triggerEventTypes?: string[];
  triggerWildcard?: boolean;
}

// ── Rule Definition (verbatim from rule-definition.entity.ts) ───────────────

export type RuleDefinitionState = 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'DISABLED' | 'ROLLED_BACK' | 'ARCHIVED';
export type RuleDefinitionKind = 'TASK' | 'ACHIEVEMENT' | 'CAMPAIGN';

export interface RuleDefinition {
  id: string;
  definitionKey: string;
  definitionVersion: number;
  kind: RuleDefinitionKind;
  state: RuleDefinitionState;
  graphDefinition: RuleGraph;
  compiledPlan?: unknown | null;
  compiledHash?: string | null;
  compilerVersion?: string | null;
  targetCount: string;
  rewardDefinition: Record<string, unknown>;
  triggerEventTypes: string[];
  triggerWildcard: boolean;
  startAt?: string | null;
  endAt?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** POST /admin/rules request body — verbatim from RuleAdminController#create. */
export interface CreateRuleRequest {
  definitionKey: string;
  definitionVersion: number;
  kind: RuleDefinitionKind;
  graphDefinition: RuleGraph;
  targetCount: string;
  rewardDefinition?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * GET /admin/rules list row — lighter than the full RuleDefinition (no
 * graphDefinition/rewardDefinition/metadata), matching the backend's
 * RuleDefinitionSummary DTO exactly (rule-definition.service.ts).
 */
export interface RuleDefinitionSummary {
  id: string;
  definitionKey: string;
  definitionVersion: number;
  kind: RuleDefinitionKind;
  state: RuleDefinitionState;
  targetCount: string;
  triggerWildcard: boolean;
  triggerEventTypes: string[];
  startAt: string | null;
  endAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RuleDefinitionListQuery {
  kind?: RuleDefinitionKind;
  state?: RuleDefinitionState;
  definitionKey?: string;
  limit?: number;
  offset?: number;
}

export interface RuleDefinitionListResult {
  items: RuleDefinitionSummary[];
  total: number;
  limit: number;
  offset: number;
}
