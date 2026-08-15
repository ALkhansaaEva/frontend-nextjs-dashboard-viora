import apiClient from '@/lib/api/api-client';
import type {
  NodeRegistryResponse, RuleDefinition, CreateRuleRequest, RuleGraph,
  RuleGraphValidationResult, RuleDefinitionListQuery, RuleDefinitionListResult,
  RuleDefinitionSummary,
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

  /** POST /admin/rules/validate-graph — dry-validate a graph without persisting anything. */
  async validateGraph(graphDefinition: RuleGraph): Promise<RuleGraphValidationResult> {
    return apiClient.post<RuleGraphValidationResult>('/admin/rules/validate-graph', { graphDefinition });
  },

  /** POST /admin/rules/:id/validate — DRAFT -> VALIDATED. */
  async validateRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/validate`, { reason });
  },

  /** POST /admin/rules/:id/preview — simulate against a sample GameplayEventEnvelope. */
  async previewRule(id: string, event: Record<string, unknown>): Promise<unknown> {
    return apiClient.post<unknown>(`/admin/rules/${id}/preview`, { event });
  },

  /** POST /admin/rules/:id/publish — VALIDATED -> PUBLISHED. Immutable after this. */
  async publishRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/publish`, { reason });
  },

  /** POST /admin/rules/:id/disable — PUBLISHED -> DISABLED. */
  async disableRule(id: string, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${id}/disable`, { reason });
  },

  /** POST /admin/rules/:key/rollback/:version. */
  async rollbackRule(definitionKey: string, version: number, reason: string): Promise<RuleDefinition> {
    return apiClient.post<RuleDefinition>(`/admin/rules/${encodeURIComponent(definitionKey)}/rollback/${version}`, { reason });
  },

  /** GET /progress?kind=TASK|ACHIEVEMENT — self-service progress query (not admin-gated). */
  async getProgress(kind: 'TASK' | 'ACHIEVEMENT' = 'TASK', params?: { limit?: number; offset?: number }): Promise<unknown> {
    return apiClient.get('/progress', { params: { kind, ...params } });
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
