import apiClient from '@/lib/api/api-client';
import type {
  AgentProfile, CreateAgentRequest, SetAgentStatusRequest, AgentTransferRequest,
  AgentPolicyRequest, ReviewAgentTopupRequest,
} from '@/types/agents';

function idemHeader(key: string) {
  return { headers: { 'Idempotency-Key': key } };
}

/** Wraps AgentsController / AgentTopupsController / AgentTopupReviewController exactly. */
export const agentsService = {
  /** GET /admin/agents — real list endpoint, no pagination server-side. */
  async list(): Promise<AgentProfile[]> {
    return apiClient.get<AgentProfile[]>('/admin/agents');
  },

  async create(data: CreateAgentRequest): Promise<AgentProfile> {
    return apiClient.post<AgentProfile>('/admin/agents', data);
  },

  async setStatus(agentId: string, data: SetAgentStatusRequest): Promise<AgentProfile> {
    return apiClient.patch<AgentProfile>(`/admin/agents/${agentId}/status`, data);
  },

  /** agents.execute + financial.execute. Idempotency-Key required by backend. */
  async fund(agentId: string, data: AgentTransferRequest, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/agents/${agentId}/fund`, data, idemHeader(idempotencyKey));
  },
  async sale(agentId: string, data: AgentTransferRequest, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/agents/${agentId}/sales`, data, idemHeader(idempotencyKey));
  },
  async redeem(agentId: string, data: AgentTransferRequest, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/agents/${agentId}/redemptions`, data, idemHeader(idempotencyKey));
  },
  async reverseTransfer(transferId: string, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/agents/transfers/${transferId}/reverse`, {}, idemHeader(idempotencyKey));
  },

  async createCommissionPolicy(data: AgentPolicyRequest): Promise<unknown> {
    return apiClient.post('/admin/agents/policies/commission', data);
  },
  async createLimitPolicy(data: AgentPolicyRequest): Promise<unknown> {
    return apiClient.post('/admin/agents/policies/limits', data);
  },
  async publishPolicy(kind: 'commission' | 'limit', policyId: string): Promise<unknown> {
    return apiClient.post(`/admin/agents/policies/${kind}/${policyId}/publish`);
  },

  // ── Topup review ──
  async listDeadLetterTopups(): Promise<unknown> {
    // NOTE: no admin "list all topups" endpoint exists — AgentTopupsController.listOwn()
    // is self-service (the calling agent's own topups only). Admin review acts on a
    // topupId the operator already has (e.g. from an out-of-band notification/support ticket).
    return Promise.resolve([]);
  },
  async markProofScan(topupId: string, state: 'clean' | 'rejected' | 'error'): Promise<unknown> {
    return apiClient.post(`/admin/agent-topups/${topupId}/proof-scan/${state}`);
  },
  async reviewTopup(topupId: string, data: ReviewAgentTopupRequest): Promise<unknown> {
    return apiClient.post(`/admin/agent-topups/${topupId}/review`, data);
  },
  async settleTopup(topupId: string, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/agent-topups/${topupId}/settle`, {}, idemHeader(idempotencyKey));
  },

  // ── Governance ──
  async getGovernance(agentId: string): Promise<unknown> {
    return apiClient.get(`/admin/agent-governance/agents/${agentId}`);
  },
  async createCase(agentId: string, data: Record<string, unknown>): Promise<unknown> {
    return apiClient.post(`/admin/agent-governance/agents/${agentId}/cases`, data);
  },
  async addSanction(caseId: string, data: Record<string, unknown>): Promise<unknown> {
    return apiClient.post(`/admin/agent-governance/cases/${caseId}/sanctions`, data);
  },
  async revokeSanction(sanctionId: string, data: Record<string, unknown>): Promise<unknown> {
    return apiClient.post(`/admin/agent-governance/sanctions/${sanctionId}/revoke`, data);
  },
};

export default agentsService;
