import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '@/lib/api/api-client';
import { adminService } from './admin.service';

vi.mock('@/lib/api/api-client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));

describe('adminService catalog mapping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps nested catalog titles and icons for inventory rows', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          itemId: 'f13235fa-18b7-44d6-98a4-d18539285266',
          quantity: 3,
          status: 'active',
          item: {
            code: 'frame_gold',
            type: 'frame',
            rarity: 'rare',
            title: { en: 'Golden Frame', ar: 'إطار ذهبي' },
            assets: [{ url: 'https://cdn/frame.png' }],
          },
        },
      ],
    });

    const [row] = await adminService.getUserInventory('user-1');

    expect(row?.name).toBe('Golden Frame');
    expect(row?.iconUrl).toBe('https://cdn/frame.png');
    expect(row?.itemType).toBe('frame');
    expect(row?.quantity).toBe(3);
  });

  it('accepts a bare object loadout instead of dropping it', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      id: 'load-1',
      itemId: '97172f57-92d4-4ea2-b124-c038b9a8f9cd',
      isEquipped: true,
      item: { code: 'hat_crown', title: { en: 'Crown', ar: null }, assets: [{ url: 'https://cdn/crown.png' }] },
    });

    const rows = await adminService.getUserLoadout('user-1');

    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Crown');
    expect(rows[0]?.iconUrl).toBe('https://cdn/crown.png');
  });

  it('falls back to the catalog code when no localized title exists', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ id: 'p-1', createdAt: '2026-01-02T00:00:00.000Z', bundle: { code: 'starter_bundle' } }],
    });

    const [row] = await adminService.getUserPurchases('user-1');

    expect(row?.name).toBe('starter_bundle');
  });
});
