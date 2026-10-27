/**
 * Rule Engine / Node Registry / Reward Bundle V2 — canonical backend contract types.
 *
 * Ported verbatim (field-for-field) from the backend source, NOT invented:
 * - src/modules/gameplay-events/contracts/gameplay-event.contract.ts
 * - src/modules/gameplay-events/entities/rule-definition.entity.ts
 * - src/modules/gameplay-events/rule-admin.controller.ts
 * - src/modules/gameplay-events/rule-execution.service.ts
 * - src/modules/game/rewards/reward-bundle.contract.ts
 *
 * NOTE: RuleAdminController DOES expose `GET /admin/rules` (list), `GET /admin/rules/:id`
 * (detail), and `GET /admin/rules/by-key/:definitionKey` (version history) — see
 * rulesService.listRules/getRuleById/listVersions below, which consume them. (An earlier
 * revision of this comment claimed these endpoints didn't exist; that gap has since been
 * closed on the backend and this file was verified against the current controller.)
 */

// ── Reward Bundle V2 (verbatim from reward-bundle.contract.ts) ──────────────

export const REWARD_BUNDLE_VERSION = 2 as const;
export const MAX_REWARD_COMPONENTS = 20;
export const MAX_REWARD_COMPONENT_ID_LENGTH = 64;
export const MAX_REWARD_INTERNAL_EVENT_PAYLOAD_BYTES = 1_024;

export type RewardComponentType =
  | 'XP'
  | 'GAME_CURRENCY'
  | 'ITEM'
  | 'BADGE'
  | 'BUNDLE'
  | 'NOTIFICATION'
  | 'INTERNAL_EVENT'
  | 'VOUCHER';

export const REWARD_COMPONENT_TYPES: readonly RewardComponentType[] = [
  'XP',
  'GAME_CURRENCY',
  'ITEM',
  'BADGE',
  'BUNDLE',
  'NOTIFICATION',
  'INTERNAL_EVENT',
  'VOUCHER',
];

export type RewardComponentStatus =
  | 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FAILED_FINAL';

export interface XpRewardComponent { id: string; type: 'XP'; amount: number; targetTrack?: string }
export interface GameCurrencyRewardComponent { id: string; type: 'GAME_CURRENCY'; amount: string }
export interface ItemRewardComponent { id: string; type: 'ITEM'; itemId: string; quantity: number }
export interface BadgeRewardComponent { id: string; type: 'BADGE'; badgeId: string; quantity?: number }
export interface BundleRewardComponent { id: string; type: 'BUNDLE'; bundleId: string }
export interface VoucherRewardComponent {
  id: string; type: 'VOUCHER'; definitionKey: string; quantity?: number;
}
export interface NotificationRewardComponent {
  id: string; type: 'NOTIFICATION'; notificationType: string; title?: string; message?: string;
}
export interface InternalEventRewardComponent {
  id: string; type: 'INTERNAL_EVENT'; eventType: string; payload?: Record<string, unknown>;
}

export type RewardComponent =
  | XpRewardComponent | GameCurrencyRewardComponent | ItemRewardComponent
  | BadgeRewardComponent | BundleRewardComponent | NotificationRewardComponent
  | InternalEventRewardComponent | VoucherRewardComponent;

export interface RewardBundleV2 {
  version: 2;
  components: RewardComponent[];
}

export const REWARD_ACTION_TYPES: Record<RewardComponentType, string> = {
  XP: 'GrantXP',
  GAME_CURRENCY: 'GrantGAME_CURRENCY',
  ITEM: 'GrantItem',
  BADGE: 'GrantBadge',
  BUNDLE: 'GrantBundle',
  NOTIFICATION: 'EmitNotification',
  INTERNAL_EVENT: 'EmitInternalEvent',
  VOUCHER: 'GrantVoucher',
};

/** Reverse of REWARD_ACTION_TYPES — which RewardComponentType (if any) an
 * action node type grants. Verbatim from reward-bundle.contract.ts. */
export const ACTION_REWARD_TYPES: Record<string, RewardComponentType> = {
  GrantXP: 'XP',
  GrantGAME_CURRENCY: 'GAME_CURRENCY',
  GrantItem: 'ITEM',
  GrantBadge: 'BADGE',
  GrantBundle: 'BUNDLE',
  EmitNotification: 'NOTIFICATION',
  EmitInternalEvent: 'INTERNAL_EVENT',
  GrantVoucher: 'VOUCHER',
};

export function emptyRewardBundle(): RewardBundleV2 {
  return { version: 2, components: [] };
}

/** Structural guard for values coming from persisted jsonb (unknown shape). */
export function isRewardBundleV2Shape(value: unknown): value is RewardBundleV2 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return candidate.version === 2 && Array.isArray(candidate.components);
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
      case 'BUNDLE':
        if (!c.bundleId || c.bundleId.length > 120)
          errors.push(`${label}.bundleId must be a string of 1..120 characters`);
        break;
      case 'NOTIFICATION':
        if (!c.notificationType) errors.push(`${label}.notificationType is required`);
        break;
      case 'INTERNAL_EVENT':
        if (!c.eventType) errors.push(`${label}.eventType is required`);
        break;
      case 'VOUCHER':
        if (!c.definitionKey || c.definitionKey.length > 120)
          errors.push(`${label}.definitionKey must be a string of 1..120 characters`);
        if (
          c.quantity !== undefined &&
          (!Number.isSafeInteger(c.quantity) || c.quantity < 1 || c.quantity > 10_000)
        )
          errors.push(`${label}.quantity must be 1..10000`);
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
  domainTags?: string[];
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
  mediaId?: string | null;
  previousRuleId?: string | null;
  previousVersion?: number | null;
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
  mediaId?: string | null;
}

export type UpdateRuleDraftRequest = Omit<
  CreateRuleRequest,
  'definitionKey' | 'definitionVersion' | 'kind'
>;

export interface RuleProgressStage {
  id: string;
  key: string;
  order: number;
  eventType: string;
  value: string;
  target: string;
  completedAt: string | null;
  windowIdentity: string | null;
}

export interface RuleRewardDelivery {
  componentId: string;
  type: RewardComponentType;
  status: RewardComponentStatus;
  amount: string | null;
  quantity: number | null;
  grantedAt: string | null;
  errorCode: string | null;
  windowIdentity: string | null;
}

export interface RuleProgressItem {
  id: string;
  definitionKey: string;
  definitionVersion: number;
  kind: RuleDefinitionKind;
  targetCount: string;
  metadata: Record<string, unknown>;
  mediaId?: string | null;
  completed: boolean;
  completedAt: string | null;
  progress: {
    mode: 'COUNT' | 'STAGES';
    value: string;
    target: string;
    windowIdentity: string | null;
  };
  stages: RuleProgressStage[];
  reward: {
    automatic: true;
    components: Array<{
      id: string;
      type: string;
      amount: string | null;
      quantity: number | null;
      reference: string | null;
    }>;
    delivery: RuleRewardDelivery[];
  };
}

export interface RuleProgressListResult {
  items: RuleProgressItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * GET /admin/rules list row — lighter than the full RuleDefinition (no graphDefinition/compiledPlan; metadata and a
 * shape-only rewardSummary included), matching the backend's
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
  mediaId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Authoring metadata (i18n titles, rarity, taskType…) — small jsonb. */
  metadata: Record<string, unknown>;
  /** Shape-only reward info for catalogs; the full bundle stays in detail. */
  rewardSummary:
    | { kind: 'none' }
    | { kind: 'bundle'; components: number }
    | { kind: 'legacy' };
}

export type RuleWindowType =
  | 'Lifetime' | 'Daily' | 'Weekly' | 'Monthly'
  | 'RollingMinutes' | 'RollingHours' | 'RollingDays'
  | 'EventWindow' | 'CampaignWindow' | 'SessionWindow' | 'MatchWindow';

export interface RuleDefinitionListQuery {
  kind?: RuleDefinitionKind;
  state?: RuleDefinitionState;
  definitionKey?: string;
  /** Window projection filter (Daily/Weekly mission views). */
  window?: RuleWindowType;
  limit?: number;
  offset?: number;
}

export interface RuleDefinitionListResult {
  items: RuleDefinitionSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD';

export interface AchievementTierDefinition {
  id: string;
  ruleId: string;
  ruleVersion: number;
  tierOrder: number;
  tier: AchievementTier;
  threshold: string;
  badgeDefinitionId: string;
  iconMediaId: string;
  rewardDefinition: RewardBundleV2;
  metadata: Record<string, unknown>;
}

export interface AchievementTierInput {
  tierOrder: number;
  tier: AchievementTier;
  threshold: string;
  badgeDefinitionId: string;
  iconMediaId: string;
  rewardDefinition: RewardBundleV2;
  metadata?: Record<string, unknown>;
}

/** Identity rules enforced by RuleDefinitionService.create — mirrored for
 * client-side pre-flight (the backend call remains authoritative). */
export const RULE_IDENTITY = {
  // Mirrors backend gameplay-events/definition-key.ts. New definitions use
  // lowercase keys; legacy uppercase rows remain readable on the backend.
  keyPattern: /^[a-z0-9][a-z0-9_.-]{2,119}$/,
  targetCountPattern: /^[1-9][0-9]*$/,
} as const;

/** Normalises newly-authored input without rewriting persisted legacy keys. */
export function normalizeDefinitionKeyInput(value: string): string {
  return value.toLowerCase();
}

// ── Gameplay event envelope + dry-run preview (verbatim from
// gameplay-event.contract.ts / rule-execution.service.ts) ───────────────────

export const GAMEPLAY_EVENT_TYPES = [
  'MATCH_CREATED', 'MATCH_STARTED', 'MATCH_FINISHED', 'MATCH_WON',
  'MATCH_LOST', 'MATCH_DRAWN', 'PLAYER_JOINED', 'PLAYER_LEFT',
  'PLAYER_RECONNECTED', 'PLAYER_FORFEITED', 'TURN_STARTED',
  'TURN_COMPLETED', 'PIECE_MOVED', 'PIECE_CAPTURED', 'DICE_ROLLED',
  'DOMINO_PLAYED', 'DOMINO_PASSED', 'ROUND_WON', 'ROUND_LOST',
  'AREA_ENTERED', 'AREA_REACHED', 'CHECKPOINT_REACHED',
  'ZONE_COMPLETED', 'OBJECTIVE_STARTED', 'OBJECTIVE_PROGRESS',
  'OBJECTIVE_COMPLETED', 'COMBO_COMPLETED', 'STREAK_UPDATED',
  'GAME_TIMEOUT', 'ROOM_ROUND_STARTED', 'ROOM_ROUND_FINISHED',
  'GIFT_SENT', 'GIFT_RECEIVED', 'ITEM_PURCHASED', 'AGENT_TOPUP',
  'IAP_PURCHASE', 'LOGIN', 'DAILY_RESET', 'WEEKLY_RESET',
  'SCHEDULE_TRIGGERED', 'CAMPAIGN_STARTED', 'CAMPAIGN_ENDED',
  'AGENT_REGISTERED', 'AGENT_APPROVED', 'AGENT_SALE_SETTLED', 'AGENT_FIRST_SALE',
  'AGENT_CASHOUT_SETTLED', 'AGENT_REPORTED', 'AGENT_SANCTIONED',
  'DISTRIBUTOR_REGISTERED', 'DISTRIBUTOR_ALLOCATION_SETTLED',
  'ROOM_JOINED', 'ROOM_LEFT', 'ROOM_ROUND_WON', 'ROOM_ROUND_DRAWN',
  'ROOM_MESSAGE_SENT', 'ROOM_MESSAGE_ACCEPTED', 'ROOM_CHAT_CHARACTER_COUNT',
  'ROOM_CHAT_LEVEL_REACHED', 'ROOM_REACTION_RECEIVED',
  'ITEM_GRANTED', 'ITEM_EQUIPPED', 'PLAYER_LEVEL_REACHED', 'ROOM_MEMBER_LEVEL_REACHED',
  'ROOM_LEVEL_REACHED', 'CHAT_CONTRIBUTION_LEVEL_REACHED', 'STORE_REFUNDED',
  'IAP_REVERSED', 'ADMIN_ACTION_COMPLETED', 'SOCIAL_RELATIONSHIP_CHANGED',
] as const;

export type GameplayEventType = (typeof GAMEPLAY_EVENT_TYPES)[number];

export interface GameplayEventEnvelope {
  eventId: string;
  eventType: GameplayEventType;
  eventVersion: number;
  producer: 'NAKAMA' | 'NESTJS';
  sourceService: string;
  gameType?: string;
  gameVersion?: string;
  rulesVersion?: string;
  backendMatchId?: string;
  nakamaMatchId?: string;
  userId?: string;
  participants?: string[];
  occurredAt: string;
  receivedAt?: string;
  sequence: number;
  partitionKey?: string;
  matchSequence?: number;
  userSequence?: number;
  definitionPins: Record<string, unknown>;
  payload: Record<string, unknown>;
  correlationId: string;
  causationId?: string;
  traceId: string;
  integrity: { keyVersion: string; signature: string; signedAt: string };
}

export type RuleAccumulatorMode = 'increment' | 'sum' | 'min' | 'max' | 'distinct_count' | 'consecutive';

export type RuleNodeExecutionStatus = 'SUCCESS' | 'FALSE_GATE' | 'SKIPPED_UPSTREAM' | 'FAILED' | 'NO_OP';

export interface RuleNodeExecutionInput {
  nodeId: string;
  status: RuleNodeExecutionStatus;
  valueType: RulePortDataType;
  value?: string;
}

export interface RuleNodeExecutionResult {
  order: number;
  nodeType: string;
  status: RuleNodeExecutionStatus;
  matched: boolean;
  valueType: RulePortDataType;
  value?: string;
  inputs: RuleNodeExecutionInput[];
  normalizedConfig: Record<string, unknown>;
  durationMs: number;
  error?: string;
  errorCode?: 'RULE_NODE_EXECUTION_FAILED';
  skippedBy?: string[];
  skipReason?: string;
}

/** Result of POST /admin/rules/:id/preview — a dry run, nothing is granted. */
export interface CompiledRuleEvaluation {
  matched: boolean;
  windowIdentity: string;
  accumulator: {
    mode: RuleAccumulatorMode;
    value: string;
    distinctValue?: string;
  };
  actionTypes: string[];
  executedSteps: number;
  nodeOutputs?: Record<string, RuleNodeExecutionResult>;
  failure?: { nodeId: string; nodeType: string; message: string };
  actions?: Array<{ nodeId: string; type: string; config: Record<string, unknown> }>;
}

/** Exact response envelope returned by POST /admin/rules/:id/preview. */
export interface RulePreviewResponse {
  ruleId: string;
  definitionKey: string;
  definitionVersion: number;
  compiledHash: string;
  evaluation: CompiledRuleEvaluation;
  persisted: false;
}

export function extractRulePreviewEvaluation(response: RulePreviewResponse): CompiledRuleEvaluation {
  return response.evaluation;
}
