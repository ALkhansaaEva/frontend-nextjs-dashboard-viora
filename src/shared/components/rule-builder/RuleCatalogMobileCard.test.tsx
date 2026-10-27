// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import mediaService from '@/services/media.service';
import type { RuleDefinitionSummary } from '@/types/rules';
import { RuleCatalogMobileCard } from './RuleCatalogMobileCard';

vi.mock('@/services/media.service', () => ({
  default: { getAdminFileById: vi.fn() },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const rule: RuleDefinitionSummary = {
  id: 'rule-1',
  definitionKey: 'achievement_topup_gold',
  definitionVersion: 3,
  kind: 'ACHIEVEMENT',
  state: 'PUBLISHED',
  targetCount: '100000',
  triggerWildcard: false,
  triggerEventTypes: ['CURRENCY_TOPUP'],
  startAt: null,
  endAt: null,
  publishedAt: '2026-08-25T00:00:00.000Z',
  mediaId: 'media-1',
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
  metadata: {},
  rewardSummary: { kind: 'bundle', components: 2 },
};

describe('RuleCatalogMobileCard', () => {
  it('renders the production catalog information and lazy artwork', async () => {
    vi.mocked(mediaService.getAdminFileById).mockResolvedValue({
      id: 'media-1', uploaderUserId: 'admin', bucket: 'achievements', path: 'gold.webp',
      mimeType: 'image/webp', sizeBytes: '128', createdAt: rule.createdAt,
      thumbnailUrl: '/v1/media/proxy/achievements/gold.webp', altText: 'Gold achievement',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <RuleCatalogMobileCard rule={rule} title="Gold Topup" detailLabel="Rarity" detailValue="legendary" onOpen={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Gold Topup')).toBeTruthy();
    expect(screen.getByText('100000')).toBeTruthy();
    expect(screen.getByText('2 component(s)')).toBeTruthy();
    expect(screen.getByText('PUBLISHED')).toBeTruthy();
    await waitFor(() => expect(screen.getByAltText('Gold achievement')).toBeTruthy());
    expect(mediaService.getAdminFileById).toHaveBeenCalledWith('media-1');
  });
});
