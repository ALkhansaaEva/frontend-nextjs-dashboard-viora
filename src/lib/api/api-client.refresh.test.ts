// @vitest-environment jsdom

import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient } from './api-client';

describe('ApiClient refresh coordination', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('refreshToken', 'rotating-refresh-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('uses one refresh request for concurrent callers and persists the rotated token', async () => {
    let resolveRefresh!: (value: unknown) => void;
    const response = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    const post = vi.spyOn(axios, 'post').mockReturnValue(response as never);
    const client = new ApiClient();

    const first = client.refreshAuthSession();
    const second = client.refreshAuthSession();

    expect(post).toHaveBeenCalledTimes(1);
    resolveRefresh({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
          user: { id: 'user-1', email: 'qa@example.com' },
          roles: ['admin'],
        },
      },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toEqual(secondResult);
    expect(localStorage.getItem('accessToken')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
  });

  it('discards a stale refresh response when the account switched mid-flight', async () => {
    let resolveRefresh!: (value: unknown) => void;
    const response = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    vi.spyOn(axios, 'post').mockReturnValue(response as never);
    const client = new ApiClient();

    const pending = client.refreshAuthSession();

    // Simulate logout + login as another account while refresh is in flight.
    localStorage.setItem('accessToken', 'account-b-access-token');
    localStorage.setItem('refreshToken', 'account-b-refresh-token');

    resolveRefresh({
      data: {
        data: {
          accessToken: 'stale-account-a-access-token',
          refreshToken: 'stale-account-a-refresh-token',
          expiresIn: 3600,
        },
      },
    });

    await expect(pending).rejects.toThrow(
      'Authentication session changed during refresh',
    );
    expect(localStorage.getItem('accessToken')).toBe('account-b-access-token');
    expect(localStorage.getItem('refreshToken')).toBe(
      'account-b-refresh-token',
    );
  });
});
