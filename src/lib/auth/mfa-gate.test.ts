import { describe, expect, it, vi } from 'vitest';
import { isMfaRequiredError, onMfaStepUp, requestMfaStepUp } from './mfa-gate';

describe('MFA step-up detection', () => {
  it('detects the normalized 403 the API client throws', () => {
    expect(
      isMfaRequiredError({ statusCode: 403, message: 'MFA verification required' }),
    ).toBe(true);
  });

  it('detects a raw Axios-shaped 403', () => {
    expect(
      isMfaRequiredError({
        response: {
          status: 403,
          data: { code: 'AUTH_FORBIDDEN', message: 'MFA verification required' },
        },
      }),
    ).toBe(true);
  });

  it('reads a nested error message', () => {
    expect(
      isMfaRequiredError({
        response: { status: 403, data: { error: { message: 'MFA verification required' } } },
      }),
    ).toBe(true);
  });

  it('ignores other 403s and other statuses', () => {
    expect(isMfaRequiredError({ statusCode: 403, message: 'Forbidden' })).toBe(false);
    expect(isMfaRequiredError({ statusCode: 401, message: 'MFA verification required' })).toBe(
      false,
    );
    expect(isMfaRequiredError(null)).toBe(false);
    expect(isMfaRequiredError('MFA verification required')).toBe(false);
  });
});

describe('MFA step-up signal', () => {
  it('notifies subscribers until they unsubscribe', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribe = onMfaStepUp(first);
    const unsubscribeSecond = onMfaStepUp(second);

    requestMfaStepUp();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribe();
    requestMfaStepUp();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    unsubscribeSecond();
  });
});
