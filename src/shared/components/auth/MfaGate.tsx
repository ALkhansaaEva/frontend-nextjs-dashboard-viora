'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Modal } from '@/shared/components/ui/Modal';
import { authService } from '@/services';
import { useAuthStore } from '@/store/auth.store';
import { onMfaStepUp } from '@/lib/auth/mfa-gate';

interface Factor {
  id?: string;
  status?: string;
  friendly_name?: string;
  factor_type?: string;
}

/**
 * Admin permissions require an `aal2` session. When the API answers
 * "MFA verification required", this gate verifies a real TOTP factor through
 * the backend (which also rotates the httpOnly session cookies) and reloads so
 * every query refetches with the upgraded token.
 */
export function MfaGate() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const data = await authService.mfaFactors();
      const candidates = [
        ...(Array.isArray(data.totp) ? data.totp : []),
        ...(Array.isArray(data.all) ? data.all : []),
      ] as Factor[];
      const unique = candidates.filter(
        (factor, index, all) => factor.id && all.findIndex((f) => f.id === factor.id) === index,
      );
      const verified = unique.filter((factor) => factor.status === 'verified');
      setFactors(verified);
      setFactorId(verified[0]?.id ?? '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load authenticators.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return onMfaStepUp(() => {
      setOpen(true);
      void load();
    });
  }, [load]);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) {
      setError('No verified authenticator is enrolled. Set one up in Security.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await authService.mfaVerifyEnable(factorId, code.trim());
      const state = useAuthStore.getState();
      if (!result.session?.accessToken || !state.user) {
        setError('The backend did not return an upgraded session. Sign in again.');
        return;
      }
      state.setAuth(
        state.user,
        result.session.accessToken,
        result.session.refreshToken,
        state.roles,
        state.permissions,
        result.session.expiresIn,
      );
      setOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'That code could not be verified.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      title="Two-factor verification"
      size="sm"
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          Administrator actions require a second factor. Enter the current code from your authenticator app.
        </p>

        {loading && <p className="text-sm text-gray-500">Loading authenticators…</p>}

        {!loading && factors.length === 0 && (
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400" role="alert">
            <p>No verified authenticator is enrolled for this account.</p>
            <Button type="button" onClick={() => window.location.assign('/security')}>
              Open Security settings
            </Button>
          </div>
        )}

        {!loading && factors.length > 0 && (
          <form onSubmit={verify} className="space-y-4">
            {factors.length > 1 && (
              <div>
                <label htmlFor="mfa-factor" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Authenticator
                </label>
                <select
                  id="mfa-factor"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                  value={factorId}
                  onChange={(event) => setFactorId(event.target.value)}
                >
                  {factors.map((factor) => (
                    <option key={factor.id} value={factor.id}>
                      {factor.friendly_name || factor.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="mfa-code" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Authentication code
              </label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || code.length < 6}>
              {busy ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
