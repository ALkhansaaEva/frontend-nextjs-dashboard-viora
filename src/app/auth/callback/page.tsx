'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google sign-in was cancelled.',
  sign_in_failed: 'Google sign-in could not be completed. Please try again.',
};

/** Only same-origin in-app paths may be used as post-login destinations. */
function safeRedirectTarget(raw: string | null): string {
  if (
    raw &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('://')
  ) {
    return raw;
  }
  return '/dashboard';
}

/**
 * Landing point after the backend finishes the Google code exchange. The
 * backend hands off an opaque, single-use id (never tokens); redeeming it
 * sets the httpOnly session cookies through the proxy and then establishes
 * the client-side session store exactly like email login does, otherwise the
 * auth gate would bounce the user back to /login.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get('handoff');
    const providerError = params.get('error');
    const target = safeRedirectTarget(params.get('redirect'));
    let cancelled = false;

    if (!handoff) {
      const message = (providerError && ERROR_MESSAGES[providerError]) || 'Sign-in did not complete.';
      // Deferred so the error is reported without a synchronous setState in the effect.
      void Promise.resolve().then(() => {
        if (!cancelled) setError(message);
      });
      return () => {
        cancelled = true;
      };
    }

    authService
      .redeemGoogleHandoff(handoff)
      .then((session) => useAuthStore.getState().loginWithGoogleSession(session))
      .then(() => {
        if (!cancelled) router.replace(target);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Google sign-in failed.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Google sign-in failed</h1>
            <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            <a href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" aria-hidden />
            <p role="status" className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              Completing Google sign-in…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
