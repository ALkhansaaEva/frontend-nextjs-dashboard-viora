import { describe, expect, it } from 'vitest';
import { authIntentFromSearch, validateNewPassword } from './login-flow';

describe('authIntentFromSearch', () => {
  it('opens the reset step for a recovery email link', () => {
    expect(authIntentFromSearch('?reset=1')).toBe('reset');
  });

  it('opens the one-time-code step for a sign-in code link', () => {
    expect(authIntentFromSearch('?otp=1')).toBe('otp');
  });

  it('ignores unknown or missing flags', () => {
    expect(authIntentFromSearch('')).toBeNull();
    expect(authIntentFromSearch('?reset=0')).toBeNull();
    expect(authIntentFromSearch('?next=/dashboard')).toBeNull();
  });

  it('does not treat a code in the URL as an intent', () => {
    expect(authIntentFromSearch('?code=123456')).toBeNull();
  });
});

describe('validateNewPassword', () => {
  it('requires at least six characters', () => {
    expect(validateNewPassword('12345', '12345')).toBe(
      'Password must be at least 6 characters.',
    );
  });

  it('requires the confirmation to match', () => {
    expect(validateNewPassword('new-password', 'new-passwerd')).toBe(
      'The two passwords do not match.',
    );
  });

  it('accepts a matching pair', () => {
    expect(validateNewPassword('new-password', 'new-password')).toBeNull();
  });
});
