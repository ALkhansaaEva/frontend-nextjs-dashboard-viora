import apiClient from '@/lib/api/api-client';

/**
 * Versioned competitive tier policies — admin/competitive-tier-policies
 * (modules/meta-game/competitive-tier-policy.controller.ts). These are the
 * rating → tier thresholds used by the meta-game ranking pipeline; Admin only
 * reads them here.
 */
export type CompetitiveTierPolicyStatus = 'DRAFT' | 'ACTIVE' | 'RETIRED';

export interface CompetitiveTierThreshold {
  code: string;
  minRating: number;
  order: number;
}

export interface CompetitiveTierPolicy {
  id: string;
  scopeKey: string;
  version: number;
  status: CompetitiveTierPolicyStatus;
  tiers: CompetitiveTierThreshold[];
  effectiveFrom: string;
  createdBy: string | null;
  createdAt: string;
}

export const competitiveTierPolicyService = {
  /** GET admin/competitive-tier-policies — requires admin.read. */
  async list(scopeKey?: string): Promise<CompetitiveTierPolicy[]> {
    return apiClient.get<CompetitiveTierPolicy[]>(
      '/admin/competitive-tier-policies',
      scopeKey ? { params: { scopeKey } } : undefined,
    );
  },
};

export default competitiveTierPolicyService;
