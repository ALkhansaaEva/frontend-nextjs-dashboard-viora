import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api/api-client';
import { progressionPolicyService, roomLevelPolicyService } from './progression.service';

vi.mock('@/lib/api/api-client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('progression policy limits contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the supported ceilings and compiled defaults from /limits', async () => {
    const limits = {
      supportedMaxLevel: 100,
      defaults: { USER_LEVEL: 100, ROOM_LEVEL: 100, CHAT_LEVEL: 100 },
      roomMic: { defaultSlots: 10, maxSlots: 64 },
    };
    vi.mocked(apiClient.get).mockResolvedValue(limits);

    await expect(progressionPolicyService.getLimits()).resolves.toEqual(limits);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/progression-policy/limits');
  });

  it('reads microphone capacity compliance rows unchanged', async () => {
    const rows = [
      {
        roomId: 'room-1',
        name: { en: 'Lounge' },
        level: 3,
        capacity: 8,
        materializedSlots: 10,
        occupiedSlots: 9,
        surplusSlots: 2,
        occupiedOverCapacity: true,
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue(rows);

    await expect(roomLevelPolicyService.micCapacity()).resolves.toEqual(rows);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/room-level-policy/mic-capacity');
  });
});
