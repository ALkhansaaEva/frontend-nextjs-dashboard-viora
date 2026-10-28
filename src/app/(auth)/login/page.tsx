'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/store';
import { authService } from '@/services';
import {
  authIntentFromSearch,
  validateNewPassword,
  type LoginMode as Mode,
} from './login-flow';

const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google', url: () => authService.getGoogleOAuthUrl() },
  { id: 'facebook', label: 'Facebook', url: () => authService.getFacebookOAuthUrl() },
] as const;

/**
 * Sign-in is four small steps of one contract, not four pages:
 *   password → POST /auth/email/login
 *   otp      → POST /auth/email/request-otp then /auth/email/verify-otp (session)
 *   forgot   → POST /auth/forgot-password (always a generic confirmation)
 *   reset    → POST /auth/reset-password with the emailed recovery token
 * OAuth initiation asks the backend for the provider URL instead of building one
 * client-side, so a provider that is not configured fails visibly here.
 */
export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loginWithOtp = useAuthStore((state) => state.loginWithOtp);
  const storeLoading = useAuthStore((state) => state.isLoading);
  const storeError = useAuthStore((state) => state.error);

  const [mode, setMode] = useState<Mode>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [devCode, setDevCode] = useState('');
  const [email, setEmail] = useState('');

  // Recovery/sign-in emails link here with an intent flag instead of a code.
  useEffect(() => {
    const intent = authIntentFromSearch(window.location.search);
    if (intent) setMode(intent);
  }, []);

  const disabled = busy || storeLoading;

  function go(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
    setDevCode('');
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const value = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setBusy(true);
    try {
      await login(value, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const value = String(form.get('email') ?? '').trim();
    const token = String(form.get('token') ?? '').trim();
    setBusy(true);
    try {
      await loginWithOtp(value, token);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'That code could not be verified');
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp() {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authService.requestEmailOTP(email.trim());
      setNotice('If that address belongs to an account, a sign-in code has been sent.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not request a code');
    } finally {
      setBusy(false);
    }
  }

  async function submitForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const value = String(new FormData(event.currentTarget).get('email') ?? '').trim();
    setBusy(true);
    try {
      const response = await authService.forgotPassword(value);
      setNotice(response.message || 'If that email is registered, a password reset code has been sent.');
      setEmail(value);
      // The backend returns a recovery code only while dev autoconfirm is on.
      if (response._dev_recovery_code) setDevCode(response._dev_recovery_code);
      setMode('reset');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not request a reset');
    } finally {
      setBusy(false);
    }
  }

  async function requestNewRecoveryCode() {
    const value = email.trim();
    if (!value) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await authService.forgotPassword(value);
      setNotice(
        response.message || 'If that email is registered, a new code has been sent.',
      );
      if (response._dev_recovery_code) setDevCode(response._dev_recovery_code);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not request a new code');
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const value = String(form.get('email') ?? '').trim();
    const token = String(form.get('token') ?? '').trim();
    const newPassword = String(form.get('newPassword') ?? '');
    const confirmation = String(form.get('confirmPassword') ?? '');
    const invalid = validateNewPassword(newPassword, confirmation);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      await authService.resetPassword(value, token, newPassword);
      setNotice('Password updated. Sign in with the new password.');
      setEmail(value);
      setDevCode('');
      setMode('password');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset the password');
    } finally {
      setBusy(false);
    }
  }

  async function startOAuth(provider: (typeof OAUTH_PROVIDERS)[number]) {
    setBusy(true);
    setError('');
    try {
      window.location.assign(await provider.url());
    } catch {
      setError(`${provider.label} sign-in is not configured on this environment.`);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-3 py-6 sm:px-4 dark:bg-gray-900">
      <div className="w-full max-w-md" dir="ltr">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">Viora Admin</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {mode === 'forgot'
                ? 'Reset your password'
                : mode === 'reset'
                  ? 'Choose a new password'
                  : mode === 'otp'
                    ? 'Sign in with a one-time code'
                    : 'Sign in to your account'}
            </p>
          </div>

          {mode === 'password' && (
            <>
              <form onSubmit={submitPassword} className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input id="email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" className="pl-10" defaultValue={email} required />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" className="pl-10" required />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="text-blue-600 hover:underline dark:text-blue-400" onClick={() => go('otp')}>
                    Use a one-time code
                  </button>
                  <button type="button" className="text-blue-600 hover:underline dark:text-blue-400" onClick={() => go('forgot')}>
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={disabled}>
                  {disabled ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  or continue with
                  <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                {OAUTH_PROVIDERS.map((provider) => (
                  <Button key={provider.id} type="button" variant="outline" className="w-full" disabled={disabled} onClick={() => void startOAuth(provider)}>
                    {provider.label}
                  </Button>
                ))}
              </div>
            </>
          )}

          {mode === 'otp' && (
            <form onSubmit={submitOtp} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="otp-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="otp-email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" className="pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="otp-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">One-time code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="otp-token" name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="pl-10" maxLength={6} required />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" disabled={disabled} onClick={() => void requestOtp()}>
                  Send code
                </Button>
                <Button type="submit" className="flex-1" disabled={disabled}>
                  Sign In
                </Button>
              </div>
              <button type="button" className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400" onClick={() => go('password')}>
                <ArrowLeft className="w-4 h-4" /> Password sign-in
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submitForgot} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="forgot-email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" className="pl-10" defaultValue={email} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={disabled}>
                Send reset email
              </Button>
              <button type="button" className="flex items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-400" onClick={() => go('password')}>
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={submitReset} className="space-y-4 sm:space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Open the recovery email and enter the 6-digit code it contains. The code
                expires 1 hour after it was sent and works once.
              </p>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="reset-email" name="email" type="email" autoComplete="email" placeholder="admin@example.com" className="pl-10" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
              </div>
              <div>
                <label htmlFor="reset-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recovery code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="reset-token" name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" className="pl-10" maxLength={6} required />
                </div>
              </div>
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="reset-password" name="newPassword" type="password" autoComplete="new-password" className="pl-10" minLength={6} required />
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirm new password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" className="pl-10" minLength={6} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={disabled}>
                Update password
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" className="text-blue-600 hover:underline dark:text-blue-400" onClick={() => void requestNewRecoveryCode()}>
                  Request a new code
                </button>
                <button type="button" className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400" onClick={() => go('password')}>
                  <ArrowLeft className="w-4 h-4" /> Back to sign in
                </button>
              </div>
            </form>
          )}

          {(error || storeError) && (
            <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error || storeError}</p>
          )}
          {notice && !error && (
            <p role="status" className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>
          )}
          {devCode && (
            <p className="mt-2 text-xs text-gray-500">
              Development recovery code: <span className="font-mono">{devCode}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
