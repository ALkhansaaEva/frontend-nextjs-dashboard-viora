import type { CampaignStatus } from '@/services/campaigns.service';

export type CampaignAdminAction = 'schedule' | 'disable' | 'archive';

/** Mirrors CampaignService's manual transition table. Time-based activation
 * and ending belong to CampaignSchedulerService and are never admin actions. */
export function getCampaignAdminActions(
  status: CampaignStatus,
): CampaignAdminAction[] {
  switch (status) {
    case 'draft':
      return ['schedule', 'disable', 'archive'];
    case 'scheduled':
    case 'active':
      return ['disable'];
    case 'ended':
    case 'disabled':
      return ['archive'];
    case 'archived':
      return [];
  }
}
