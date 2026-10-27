import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from './api.client';
import { normalizePaginatedResponse, roomsService } from './rooms.service';

vi.mock('./api.client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('roomsService moderation contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the backend-required kick duration and optional reason', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    await roomsService.kickUser('room-1', 'user-1', {
      durationType: '12m',
      reason: 'Repeated disruption',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/rooms/room-1/kick/user-1', {
      durationType: '12m',
      reason: 'Repeated disruption',
    });
  });

  it('sends the backend-required mute type without inventing a duration', async () => {
    vi.mocked(apiClient.post).mockResolvedValue(undefined);

    await roomsService.muteUser('room-1', 'user-1', {
      muteType: 'mic',
      reason: 'Audio abuse',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/rooms/room-1/mute/user-1', {
      muteType: 'mic',
      reason: 'Audio abuse',
    });
  });

  it('normalizes the public rooms envelope and derives pagination from offset', () => {
    const result = normalizePaginatedResponse<{ id: string }>({
      rooms: [{ id: 'room-1' }],
      total: 41,
      limit: 20,
      offset: 20,
    });

    expect(result).toEqual({
      data: [{ id: 'room-1' }],
      total: 41,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it('unwraps the admin room detail and maps nested profile identity', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      room: { id: 'room-1', roomCode: 'ABC', name: { en: 'Room' }, level: 2, updatedAt: '2026-01-01' },
      members: [{ id: 'membership-1', roomId: 'room-1', userId: 'user-1', role: 'member', user: { id: 'user-1', profile: { username: 'Nora' } } }],
    });

    const room = await roomsService.getAdminRoomById('room-1');

    expect(room.id).toBe('room-1');
    expect(room.members?.[0]?.user?.nickname).toBe('Nora');
    expect(room.members?.[0]?.role).toBe('member');
  });
});
