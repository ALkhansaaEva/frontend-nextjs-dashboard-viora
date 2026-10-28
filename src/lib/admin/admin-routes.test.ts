import { describe, expect, it } from 'vitest';
import {
  ADMIN_ROUTES,
  getRoutesForSection,
  matchActiveNavRoute,
  matchAdminRoute,
} from './admin-routes';

const auditedPaths = [
  '/dashboard/progression',
  '/dashboard/settings',
  '/dashboard/campaigns',
  '/dashboard/progression-tracks',
  '/dashboard/ranks',
  '/dashboard/achievements',
  '/dashboard/gameplay/rules',
  '/dashboard/payments/iap',
  '/dashboard/notifications',
  '/dashboard/rooms',
  '/dashboard/moderation',
  '/dashboard/gifts',
];

describe('admin route registry', () => {
  it('keeps every audited page registered exactly once', () => {
    for (const path of auditedPaths) {
      expect(ADMIN_ROUTES.filter((route) => route.path === path)).toHaveLength(1);
      expect(matchAdminRoute(path)?.path).toBe(path);
    }
    expect(new Set(ADMIN_ROUTES.map((route) => route.id)).size).toBe(ADMIN_ROUTES.length);
    expect(new Set(ADMIN_ROUTES.map((route) => route.path)).size).toBe(ADMIN_ROUTES.length);
  });

  it('places the dashboard home route in Overview', () => {
    expect(getRoutesForSection('overview').map((route) => route.id)).toContain('dashboard-home');
  });

  it('highlights only the most specific visible navigation route', () => {
    expect(matchActiveNavRoute('/dashboard/store')?.id).toBe('store');
    expect(matchActiveNavRoute('/dashboard/store/offers')?.id).toBe('store-offers');
    expect(matchActiveNavRoute('/dashboard/users/user-1')?.id).toBe('users');
    expect(matchActiveNavRoute('/dashboard')?.id).toBe('dashboard-home');
  });

  it('resolves a ticket detail URL to the guarded detail route', () => {
    const route = matchAdminRoute('/dashboard/support/7f3c1a90-11b2-4c8d-9e44-abc123456789');
    expect(route?.id).toBe('support-ticket');
    expect(route?.requiredPermissions).toEqual(['support.execute']);
    expect(route?.showInNav).toBe(false);
    expect(matchActiveNavRoute('/dashboard/support/7f3c1a90-11b2-4c8d-9e44-abc123456789')?.id).toBe('support');
  });
});
