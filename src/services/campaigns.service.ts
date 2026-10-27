import apiClient from '@/lib/api/api-client';

/**
 * Campaign Admin — modules/gameplay-events/campaign-admin.controller.ts
 * (`admin/campaigns`). Durable live-event definitions; the rule engine
 * consumes CAMPAIGN_STARTED/CAMPAIGN_ENDED via OnCampaignStarted/
 * OnCampaignEnded/CampaignEquals/CampaignWindow nodes. `ruleIds` REFERENCES
 * existing RuleDefinitions by id — a Campaign does not carry its own inline
 * rule graph, so there is no embedded RuleBuilder here (correctly, per the
 * actual entity shape).
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'ended' | 'disabled' | 'archived';
export type ManualCampaignStatus = 'disabled' | 'archived';

export interface CampaignDefinition {
  id: string;
  campaignKey: string;
  version: number;
  status: CampaignStatus;
  displayName: Record<string, string>;
  startAt: string;
  endAt: string;
  eligibleUsers: Record<string, unknown>;
  eligibleRegions: string[];
  eligibleRooms: Record<string, unknown>;
  eligibleGames: string[];
  ruleIds: string[];
  visualMetadata: Record<string, unknown>;
  mediaId: string | null;
  createdBy: string;
  approvedBy: string | null;
  changeReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  campaignKey: string;
  version: number;
  displayName: Record<string, string>;
  startAt: string;
  endAt: string;
  eligibleRegions?: string[];
  eligibleGames?: string[];
  ruleIds?: string[];
  eligibleUsers?: Record<string, unknown>;
  eligibleRooms?: Record<string, unknown>;
  visualMetadata?: Record<string, unknown>;
  mediaId?: string | null;
  changeReason: string;
}

export const campaignsService = {
  /** GET admin/campaigns — requires admin.read. */
  async list(): Promise<CampaignDefinition[]> {
    return apiClient.get<CampaignDefinition[]>('/admin/campaigns');
  },
  /** GET admin/campaigns/:id — requires admin.read. */
  async getById(id: string): Promise<CampaignDefinition> {
    return apiClient.get<CampaignDefinition>(`/admin/campaigns/${id}`);
  },
  /** POST admin/campaigns — requires achievements.write. */
  async createDraft(data: CreateCampaignRequest): Promise<CampaignDefinition> {
    return apiClient.post<CampaignDefinition>('/admin/campaigns', data);
  },
  /** PATCH admin/campaigns/:id — partial update of a campaign. Field names
   * match CreateCampaignRequest; `changeReason` stays mandatory for the audit
   * trail. */
  async updateDraft(id: string, data: Partial<CreateCampaignRequest>): Promise<CampaignDefinition> {
    return apiClient.patch<CampaignDefinition>(`/admin/campaigns/${id}`, data);
  },
  /** POST admin/campaigns/:id/schedule — requires configs.write. */
  async schedule(id: string): Promise<CampaignDefinition> {
    return apiClient.post<CampaignDefinition>(`/admin/campaigns/${id}/schedule`, {});
  },
  /** PATCH admin/campaigns/:id/status — requires configs.write. */
  async setStatus(id: string, status: ManualCampaignStatus, reason?: string): Promise<CampaignDefinition> {
    return apiClient.patch<CampaignDefinition>(`/admin/campaigns/${id}/status`, { status, reason });
  },
};

export default campaignsService;
