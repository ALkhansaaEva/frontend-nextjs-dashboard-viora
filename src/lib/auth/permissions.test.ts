import { describe, expect, it } from 'vitest';
import { hasAnyAdminSignal, hasRole } from './permissions';

describe('dashboard authorization', () => {
  it('does not grant access from a hard-coded role name', () => {
    expect(hasAnyAdminSignal([])).toBe(false);
  });

  it('grants access from the authoritative backend capability', () => {
    expect(hasAnyAdminSignal([], {
      canAccessAdminPanel: true,
      canManageUsers: false,
      canManageRooms: false,
      canModerateAllRooms: false,
      canAccessVoice: false,
      canCreateRooms: false,
    })).toBe(true);
  });

  it('uses the effective full-access permission as a capability fallback', () => {
    expect(hasAnyAdminSignal(['admin.full_access'])).toBe(true);
    expect(hasAnyAdminSignal(['rooms.read'])).toBe(false);
  });

  it('compares role codes after normalization', () => {
    expect(hasRole(['SUPER-ADMIN'], 'super_admin')).toBe(true);
  });
});
