import { describe, expect, it } from 'vitest';
import {
  jwtExpiryMs,
  normalizePermissionCodes,
  normalizeRoleCodes,
} from './auth.store';

describe('auth response normalization', () => {
  it('preserves and normalizes backend role codes', () => {
    expect(
      normalizeRoleCodes([
        'SUPER_ADMIN',
        { code: 'custom-operations-role' },
        'user',
      ]),
    ).toEqual(['super_admin', 'custom_operations_role', 'user']);
  });

  it('accepts permission strings and permission objects', () => {
    expect(
      normalizePermissionCodes(['ADMIN.ALL', { code: 'users.read' }]),
    ).toEqual(['admin.all', 'users.read']);
  });

  it('decodes base64url JWT expiry without requiring padding', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
    expect(jwtExpiryMs(`header.${payload}.signature`)).toBe(exp * 1000);
  });
});
