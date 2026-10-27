import apiClient from '@/lib/api/api-client';
import type {
  NodeRegistryResponse, RuleDefinition, CreateRuleRequest, RuleGraph,
  RuleGraphValidationResult, RuleDefinitionListQuery, RuleDefinitionListResult,
  RuleDefinitionSummary,
  RulePreviewResponse,
  RuleProgressListResult,
  UpdateRuleDraftRequest,
  AchievementTierDefinition,
  AchievementTierInput,
} from '@/types/rules';

/**
 * Rule Engine admin service — wraps RuleAdminController (`/admin/rules`) exactly.
 * `listRules`/`getRuleById`/`listVersions` consume the durable backend Admin read
 * APIs added alongside this Phase — there is no browser-local rule catalog.
 */
export const rulesService = {
  /** GET /admin/rules — paginated, durable, server-authoritative catalog. */
  async listRules(query: RuleDefinitionListQuery = {}): Promise<RuleDefinitionListResult> {
    return apiClient.get<RuleDefinitionListResult>('/admin/rules', { params: query });
  },

  /** GET /admin/rules/:id — full authoring detail, read back from the backend. */
  async getRuleById(id: string): Promise<RuleDefinition> {
    return apiClient.get<RuleDefinition>(`/admin/rules/${id}`);
  },

  /** GET /admin/rules/by-key/:definitionKey — version history, newest first. */
  async listVersions(definitionKey: string): Promise<RuleDefinitionSummary[]> {
    return apiClient.get<RuleDefinitionSummary[]>(`/admin/rules/by-key/${encodeURIComponent(definitionKey)}`);
  },

  /** GET /admin/rules/nodes — the authoritative Node Registry. */
  async getNodeRegistry(): Promise<NodeRegistryResponse> {
    return apiClient.get<NodeRegistryResponse>('/admin/rules/nodes');
  },

  /** POST /admin/rules — create a DRAFT RuleDefinition. Returns the created record incl. id. */
  async createRule(data: CreateRuleRequest): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>('/admin/rules', data);
  },

  /** PATCH /admin/rules/:id — mutate a DRAFT only; identity remains immutable. */
  async updateDraft(id: string, data: UpdateRuleDraftRequest): Promise<RuleDefinition> {
    return apiClient.patch<RuleDefinition>(`/admin/rules/${id}`, data);
  },

  /** POST /admin/rules/validate-graph — dry-validate a graph without persisting anything. */
  async validateGraph(graphDefinition: RuleGraph): Promise<RuleGraphValidationResult> {
    return apiClient.post<RuleGraphValidationResult>('/admin/rules/validate-graph', { graphDefinition });
  },

  /** POST /admin/rules/:id/validate — DRAFT -> VALIDATED. */
  async validateRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/validate`, { reason });
  },

  /** POST /admin/rules/:id/preview — simulate against a sample GameplayEventEnvelope. */
  async previewRule(id: string, event: Record<string, unknown>): Promise<RulePreviewResponse> {
    return apiClient.post<RulePreviewResponse>(`/admin/rules/${id}/preview`, { event });
  },

  /** POST /admin/rules/:id/publish — VALIDATED -> PUBLISHED. Immutable after this. */
  async publishRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/publish`, { reason });
  },

  /** POST /admin/rules/:id/disable — PUBLISHED -> DISABLED. */
  async disableRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/disable`, { reason });
  },

  /** POST /admin/rules/:id/archive — preserves lineage; never hard-deletes. */
  async archiveRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/archive`, { reason });
  },

  /** POST /admin/rules/:id/activate — DISABLED -> PUBLISHED. */
  async activateRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/activate`, { reason });
  },

  /** POST /admin/rules/:id/versions — server allocates and links the next DRAFT. */
  async createVersion(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/versions`, { reason });
  },

  /** POST /admin/rules/:key/rollback/:version. */
  async rollbackRule(definitionKey: string, version: number, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${encodeURIComponent(definitionKey)}/rollback/${version}`, { reason });
  },

  /** GET /progress?kind=TASK|ACHIEVEMENT — self-service progress query (not admin-gated). */
  async getProgress(kind: 'TASK' | 'ACHIEVEMENT' = 'TASK', params?: { limit?: number; offset?: number }): Promise<RuleProgressListResult> {
    return apiClient.get<RuleProgressListResult>('/progress', { params: { kind, ...params } });
  },

  async getAchievementTiers(ruleId: string): Promise<AchievementTierDefinition[]> {
    return apiClient.get<AchievementTierDefinition[]>(`/admin/rules/${ruleId}/tiers`);
  },

  async replaceAchievementTiers(
    ruleId: string,
    tiers: AchievementTierInput[],
  ): Promise<AchievementTierDefinition[]> {
    return apiClient.patch<AchievementTierDefinition[]>(`/admin/rules/${ruleId}/tiers`, { tiers });
  },

  /** GET /admin/gameplay-events/dead-letters. */
  async getDeadLetters(limit?: number): Promise<unknown> {
    return apiClient.get('/admin/gameplay-events/dead-letters', { params: { limit } });
  },

  /** POST /admin/gameplay-events/:id/replay. */
  async replayEvent(id: string, reason: string): Promise<unknown> {
    return apiClient.post(`/admin/gameplay-events/${id}/replay`, { reason });
  },
};

export default rulesService;
