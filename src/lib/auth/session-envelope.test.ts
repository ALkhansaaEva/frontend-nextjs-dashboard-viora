import { describe, expect, it } from 'vitest';
import { readAuthSessionEnvelope } from './session-envelope';

describe('auth session envelope', () => {
  it('reads the Backend success envelope', () => {
    expect(readAuthSessionEnvelope({
      success: true,
      data: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      },
    })).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    });
  });

  it('rejects a response without an access token', () => {
    expect(readAuthSessionEnvelope({ success: true, data: {} })).toBeNull();
  });
});
