import { describe, expect, it } from 'vitest';
import { getCampaignAdminActions } from './campaign-lifecycle';

describe('campaign admin lifecycle', () => {
  it('does not expose scheduler-owned activation or ending transitions', () => {
    for (const status of ['draft', 'scheduled', 'active', 'ended', 'disabled', 'archived'] as const) {
      expect(getCampaignAdminActions(status)).not.toContain('activate');
      expect(getCampaignAdminActions(status)).not.toContain('end');
    }
  });

  it('matches the backend manual transition table', () => {
    expect(getCampaignAdminActions('draft')).toEqual(['schedule', 'disable', 'archive']);
    expect(getCampaignAdminActions('scheduled')).toEqual(['disable']);
    expect(getCampaignAdminActions('active')).toEqual(['disable']);
    expect(getCampaignAdminActions('ended')).toEqual(['archive']);
    expect(getCampaignAdminActions('disabled')).toEqual(['archive']);
    expect(getCampaignAdminActions('archived')).toEqual([]);
  });
});
