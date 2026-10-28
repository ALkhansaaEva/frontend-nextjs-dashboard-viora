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

  it('parses the writable config schema from /configs/schema', async () => {
    const schema = [
      {
        key: 'room.maxMembers',
        kind: 'integer',
        min: 2,
        max: 200,
        live: true,
        note: null,
        defaultValue: 10,
      },
      {
        key: 'room.creation.enabled',
        kind: 'boolean',
        min: null,
        max: null,
        live: true,
        note: null,
        defaultValue: true,
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue(schema);

    await expect(configsService.getSchema()).resolves.toEqual(schema);
    expect(apiClient.get).toHaveBeenCalledWith('/configs/schema');
  });

  it('rejects schema entries with an unknown value kind', async () => {
    vi.mocked(apiClient.get).mockResolvedValue([
      {
        key: 'room.maxMembers',
        kind: 'float',
        min: null,
        max: null,
        live: true,
        note: null,
        defaultValue: 1,
      },
    ]);

    await expect(configsService.getSchema()).rejects.toThrow();
  });
});
