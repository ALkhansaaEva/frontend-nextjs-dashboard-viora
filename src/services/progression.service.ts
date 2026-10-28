import apiClient from '@/lib/api/api-client';
import type { RewardBundleV2 } from '@/types/rules';

/**
 * Progression Policy — modules/game/progression-policy.controller.ts
 * (`admin/progression-policy`). Versioned, effective-dated MAX LEVEL cap per
 * track. This is the runtime authority for level caps — NOT a level/reward
 * table (that's RoomLevelPolicy below, and a dedicated Player service this
 * pass didn't reach). Draft → activate is a four-eyes audited operation.
 */
export type ProgressionPolicyType = 'USER_LEVEL' | 'ROOM_LEVEL' | 'CHAT_LEVEL';
export type ProgressionPolicyStatus = 'draft' | 'active' | 'retired';

export interface ProgressionLevelPolicy {
  id: string;
  policyType: ProgressionPolicyType;
  maxLevel: number;
  version: number;
  status: ProgressionPolicyStatus;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  approvedBy: string | null;
  changeReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateProgressionPolicyDraftRequest {
  policyType: ProgressionPolicyType;
  maxLevel: number;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  changeReason: string;
  metadata?: Record<string, unknown>;
}

/** POST /admin/progression-policy/:id/activate answers with the activated
 * policy plus whether the target was already the active one and the previous
 * state. `before` is not pinned by the contract, so it stays opaque. */
export interface ActivateProgressionPolicyResult {
  policy: ProgressionLevelPolicy;
  duplicate: boolean;
  before: unknown;
}

/** GET /admin/progression-policy/limits — supported ceilings and compiled
 * fallbacks. The fallbacks apply only while no active policy row exists. */
export interface ProgressionPolicyLimits {
  supportedMaxLevel: number;
  defaults: Record<ProgressionPolicyType, number>;
  roomMic: {
    defaultSlots: number;
    maxSlots: number;
  };
}

export const progressionPolicyService = {
  /** GET admin/progression-policy?policyType= — requires admin.read. */
  async list(policyType: ProgressionPolicyType): Promise<ProgressionLevelPolicy[]> {
    return apiClient.get<ProgressionLevelPolicy[]>('/admin/progression-policy', { params: { policyType } });
  },
  /** GET admin/progression-policy/limits — requires admin.read. */
  async getLimits(): Promise<ProgressionPolicyLimits> {
    return apiClient.get<ProgressionPolicyLimits>('/admin/progression-policy/limits');
  },
  /** POST admin/progression-policy/draft — requires configs.write. */
  async createDraft(data: CreateProgressionPolicyDraftRequest): Promise<ProgressionLevelPolicy> {
    return apiClient.post<ProgressionLevelPolicy>('/admin/progression-policy/draft', data);
  },
  /** POST admin/progression-policy/:id/activate — requires configs.write. */
  async activate(id: string): Promise<ActivateProgressionPolicyResult> {
    return apiClient.post<ActivateProgressionPolicyResult>(`/admin/progression-policy/${id}/activate`, {});
  },
};

/**
 * Room Level Policy — modules/rooms/room-level-policy.controller.ts
 * (`admin/room-level-policy`). Full-replace of the contiguous level table
 * (1..activeMaxLevel from ProgressionPolicy 'ROOM_LEVEL'). Capability config
 * (seats/mics/unlocks) PLUS the canonical RewardBundleV2 granted when a room
 * reaches a level — the backend write contract accepts `rewardBundle`
 * (RoomLevelPolicyInput, validated with the canonical bundle validator) and
 * room-reward.listener dispatches it at runtime with receipt idempotency.
 */
export interface RoomLevelConfigRow {
  level: number;
  xpRequired: number;
  micSlots: number;
  defaultSeatCount: number;
  maxSeatCount: number;
  featureFlags: Record<string, boolean>;
  themeUnlocks: string[];
  version: number;
  rewardBundle?: RewardBundleV2 | null;
}

export interface RoomLevelPolicyInput {
  level: number;
  xpRequired: number;
  micSlots: number;
  defaultSeatCount: number;
  maxSeatCount: number;
  featureFlags?: Record<string, boolean>;
  themeUnlocks?: string[];
  rewardBundle?: RewardBundleV2 | null;
  expectedVersion?: number;
  reason: string;
}

/** One active room above its effective microphone capacity. `name` is the
 * room's localized name map (null when the room has no stored name). */
export interface RoomMicCapacityRow {
  roomId: string;
  name: Record<string, string> | null;
  level: number;
  capacity: number;
  materializedSlots: number;
  occupiedSlots: number;
  surplusSlots: number;
  occupiedOverCapacity: boolean;
}

export const roomLevelPolicyService = {
  /** GET admin/room-level-policy — requires admin.read. */
  async list(): Promise<RoomLevelConfigRow[]> {
    return apiClient.get<RoomLevelConfigRow[]>('/admin/room-level-policy');
  },
  /** GET admin/room-level-policy/mic-capacity — active rooms whose
   * materialized slots or occupancy exceed their effective capacity. */
  async micCapacity(): Promise<RoomMicCapacityRow[]> {
    return apiClient.get<RoomMicCapacityRow[]>('/admin/room-level-policy/mic-capacity');
  },
  /** PUT admin/room-level-policy — requires configs.write. Full replace:
   * must contain exactly levels 1..activeMaxLevel, contiguous, with strictly
   * increasing XP thresholds AND strictly increasing increments. */
  async replace(levels: RoomLevelPolicyInput[]): Promise<RoomLevelConfigRow[]> {
    return apiClient.put<RoomLevelConfigRow[]>('/admin/room-level-policy', { levels });
  },
};

/**
 * Player Level Config — modules/game/level-config.controller.ts
 * (`admin/level-config`). The player level table (level_config): XP
 * thresholds + per-level RewardBundleV2, capped by the active USER_LEVEL
 * progression policy. Authoring is RewardBundleV2-only — the legacy flat
 * rewardGameCurrency is never writable from Admin.
 */
export interface PlayerLevelConfigRow {
  level: number;
  xpRequired: number;
  rewardBundle?: RewardBundleV2 | null;
  rewardGameCurrency?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerLevelConfigInput {
  level: number;
  xpRequired: number;
  rewardBundle?: RewardBundleV2 | null;
}

export const levelConfigService = {
  /** GET admin/level-config — requires admin.read. */
  async list(): Promise<{ maxLevel: number; levels: PlayerLevelConfigRow[] }> {
    return apiClient.get<{ maxLevel: number; levels: PlayerLevelConfigRow[] }>('/admin/level-config');
  },
  /** PUT admin/level-config — requires configs.write. Full replace of
   * levels 1..USER_LEVEL policy cap. */
  async replace(levels: PlayerLevelConfigInput[], reason: string): Promise<PlayerLevelConfigRow[]> {
    return apiClient.put<PlayerLevelConfigRow[]>('/admin/level-config', { levels, reason });
  },
};

export default progressionPolicyService;
