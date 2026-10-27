import apiClient from '@/lib/api/api-client';
import type { RewardBundleV2 } from '@/types/rules';

/**
 * Generic Progression Tracks — admin/progression-tracks
 * (modules/game/progression-track.controller.ts → ProgressionTrackAdminController).
 * Covers non-reserved ProgressionTrackType values only: ROOM_MEMBER_LEVEL,
 * CHAT_CONTRIBUTION_LEVEL, GAME_LEVEL. PLAYER_LEVEL and ROOM_LEVEL are
 * reserved for their dedicated authority services (see /dashboard/progression).
 *
 * Lifecycle (backend-authoritative):
 *   DRAFT → editable (PATCH) → PUBLISHED (immutable) → new version for changes
 *   DRAFT/PUBLISHED → DISABLED (stops runtime XP application)
 *   publish archives the previously PUBLISHED version of the same trackKey.
 * All reads come from the database — no session-only history.
 */
export type ProgressionTrackType = 'ROOM_MEMBER_LEVEL' | 'CHAT_CONTRIBUTION_LEVEL' | 'GAME_LEVEL';

/** The only trackType the backend accepts for Admin authoring — the other two
 * are reserved for dedicated authority services (see /dashboard/progression). */
export const AUTHORABLE_TRACK_TYPES = ['CHAT_CONTRIBUTION_LEVEL'] as const satisfies ProgressionTrackType[];

/** What happens to players already holding XP when a new version replaces a
 * published one. The publish endpoint requires this explicitly. */
export type ProgressionTrackVersionPolicy = 'RESET' | 'CARRY_XP' | 'RECOMPUTE_LEVEL';

export interface ProgressionTrackThresholdInput {
  level: number;
  /** Integer-string — never coerce through Number for large values. */
  requiredXp: string;
  rewardBundle?: RewardBundleV2 | null;
}

export interface ProgressionTrackVersion {
  id: string;
  trackKey: string;
  trackType: ProgressionTrackType;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';
  thresholds: ProgressionTrackThresholdInput[];
  createdBy: string;
  publishedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProgressionTrackSummary {
  id: string;
  trackKey: string;
  trackType: ProgressionTrackType;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';
  thresholdCount: number;
  createdBy: string;
  publishedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ProgressionTrackListQuery {
  trackType?: ProgressionTrackType;
  status?: 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED';
  trackKey?: string;
  limit?: number;
  offset?: number;
}

export interface ProgressionTrackListResult {
  items: ProgressionTrackSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateProgressionTrackRequest {
  trackKey: string;
  trackType: ProgressionTrackType;
  version: number;
  thresholds: ProgressionTrackThresholdInput[];
  metadata?: Record<string, unknown>;
}

export const progressionTracksService = {
  /** GET admin/progression-tracks — server-side paginated list (admin.read). */
  async list(query: ProgressionTrackListQuery = {}): Promise<ProgressionTrackListResult> {
    return apiClient.get<ProgressionTrackListResult>('/admin/progression-tracks', { params: query });
  },

  /** GET admin/progression-tracks/:id — full version incl. thresholds (admin.read). */
  async getById(id: string): Promise<ProgressionTrackVersion> {
    return apiClient.get<ProgressionTrackVersion>(`/admin/progression-tracks/${id}`);
  },

  /** GET admin/progression-tracks/by-key/:trackKey — version history, newest first (admin.read). */
  async listByKey(trackKey: string): Promise<ProgressionTrackVersion[]> {
    return apiClient.get<ProgressionTrackVersion[]>(`/admin/progression-tracks/by-key/${encodeURIComponent(trackKey)}`);
  },

  /** POST admin/progression-tracks — create DRAFT (admin.write). */
  async create(data: CreateProgressionTrackRequest): Promise<ProgressionTrackVersion> {
    return apiClient.post<ProgressionTrackVersion>('/admin/progression-tracks', data);
  },

  /** PATCH admin/progression-tracks/:id — DRAFT-only edit (admin.write). */
  async updateDraft(id: string, patch: { thresholds?: ProgressionTrackThresholdInput[]; metadata?: Record<string, unknown> }): Promise<ProgressionTrackVersion> {
    return apiClient.patch<ProgressionTrackVersion>(`/admin/progression-tracks/${id}`, patch);
  },

  /** POST admin/progression-tracks/:id/publish — DRAFT → PUBLISHED (admin.write).
   * `versionPolicy` is mandatory: publishing over an existing published version
   * decides whether held XP is reset, carried, or the level recomputed. */
  async publish(id: string, versionPolicy: ProgressionTrackVersionPolicy): Promise<ProgressionTrackVersion> {
    return apiClient.post<ProgressionTrackVersion>(`/admin/progression-tracks/${id}/publish`, { versionPolicy });
  },

  /** POST admin/progression-tracks/:id/disable — DRAFT/PUBLISHED → DISABLED (admin.write). */
  async disable(id: string): Promise<ProgressionTrackVersion> {
    return apiClient.post<ProgressionTrackVersion>(`/admin/progression-tracks/${id}/disable`, {});
  },
};

export default progressionTracksService;
