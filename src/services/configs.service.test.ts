import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api/api-client';
import { configsService } from './configs.service';

vi.mock('@/lib/api/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('configsService contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('unwraps the backend feature-enabled response object', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ key: 'new_room_ui', enabled: true });

    await expect(configsService.isFeatureEnabled('new_room_ui')).resolves.toBe(true);
  });

  it('sends rolloutPercent using the backend field name', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    await configsService.setFeatureFlag('new_room_ui', true, 25);

    expect(apiClient.post).toHaveBeenCalledWith('/configs/flags', {
      key: 'new_room_ui',
      enabled: true,
      rolloutPercent: 25,
    });
  });
});
