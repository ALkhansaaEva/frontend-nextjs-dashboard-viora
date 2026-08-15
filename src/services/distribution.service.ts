import apiClient from '@/lib/api/api-client';
import type {
  MasterDistributorProfile, CreateDistributorRequest, DistributionStatus,
  CreateRatePolicyRequest, ExchangeRatePolicy, CashoutReleaseRequest,
  DistributorListQuery, DistributorListResult, DistributorAgentAssignment,
} from '@/types/agents';

function idemHeader(key: string) {
  return { headers: { 'Idempotency-Key': key } };
}

/**
 * Wraps DistributionAdminController (`/admin/distribution`) exactly.
 * `listDistributors`/`getDistributorById`/`listDistributorAgents` consume the
 * durable backend read APIs added alongside this Phase — no browser-local
 * distributor authority.
 */
export const distributionService = {
  /** GET /admin/distribution/distributors — paginated, durable, server-authoritative. */
  async listDistributors(query: DistributorListQuery = {}): Promise<DistributorListResult> {
    return apiClient.get<DistributorListResult>('/admin/distribution/distributors', { params: query });
  },

  /** GET /admin/distribution/distributors/:id */
  async getDistributorById(id: string): Promise<MasterDistributorProfile> {
    return apiClient.get<MasterDistributorProfile>(`/admin/distribution/distributors/${id}`);
  },

  /** GET /admin/distribution/distributors/:id/agents — assignment history (incl. ended). */
  async listDistributorAgents(id: string): Promise<DistributorAgentAssignment[]> {
    return apiClient.get<DistributorAgentAssignment[]>(`/admin/distribution/distributors/${id}/agents`);
  },

  async createDistributor(data: CreateDistributorRequest): Promise<MasterDistributorProfile> {
    return apiClient.post<MasterDistributorProfile>('/admin/distribution/distributors', data);
  },
  async setStatus(id: string, status: DistributionStatus): Promise<MasterDistributorProfile> {
    return apiClient.patch<MasterDistributorProfile>(`/admin/distribution/distributors/${id}/status`, { status });
  },
  async assignAgent(distributorId: string, agentId: string): Promise<unknown> {
    return apiClient.post(`/admin/distribution/distributors/${distributorId}/agents`, { agentId });
  },
  async setAgentCapabilities(agentId: string, capabilities: string[], restrictions: string[]): Promise<unknown> {
    return apiClient.patch(`/admin/distribution/agents/${agentId}/capabilities`, { capabilities, restrictions });
  },
  async fundDistributor(id: string, amount: string, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/distribution/distributors/${id}/fund`, { amount }, idemHeader(idempotencyKey));
  },

  async createRatePolicy(data: CreateRatePolicyRequest): Promise<ExchangeRatePolicy> {
    return apiClient.post<ExchangeRatePolicy>('/admin/distribution/rates', data);
  },
  async approveRatePolicy(id: string): Promise<ExchangeRatePolicy> {
    return apiClient.post<ExchangeRatePolicy>(`/admin/distribution/rates/${id}/approve`);
  },

  async settleCashout(id: string, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/distribution/cashouts/${id}/settle`, {}, idemHeader(idempotencyKey));
  },
  async releaseCashout(id: string, data: CashoutReleaseRequest, idempotencyKey: string): Promise<unknown> {
    return apiClient.post(`/admin/distribution/cashouts/${id}/release`, data, idemHeader(idempotencyKey));
  },
};

export default distributionService;
