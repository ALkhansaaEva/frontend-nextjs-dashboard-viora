'use client';

import { useEffect, useRef, useState, memo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LanguageProvider } from '@/components/language-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/store/auth.store';
import { Toaster } from '@/shared/components/ui/Toaster';
import { MfaGate } from '@/shared/components/auth/MfaGate';
import { hasAnyAdminSignal } from '@/lib/auth/permissions';

const PUBLIC_ROUTES = ['/login', '/', '/account-deletion', '/auth/callback'];

const AuthCheckComponent = memo(function AuthCheck({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [checked, setChecked] = useState(false);
  // Authentication is an application bootstrap concern. Keeping the first
  // pathname in a ref prevents every client-side dashboard navigation from
  // re-running initAuth() and replacing the whole app with the loading screen.
  const initialPathnameRef = useRef(pathname);
  const authCheckStartedRef = useRef(false);

  useEffect(() => {
    // Next's router object and external-store updates may cause this component
    // to render again while auth is resolving. Bootstrap must remain a
    // single-flight operation; otherwise each completion writes to Zustand and
    // can recursively restart this effect until React hits its depth guard.
    if (authCheckStartedRef.current) return;
    authCheckStartedRef.current = true;

    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      setChecked(true);
      if (useAuthStore.getState().isLoading) setLoading(false);
    };

    const runAuthCheck = async () => {
      // Start after hydration so persisted Zustand/localStorage state is ready.
      await Promise.resolve();
      if (cancelled) return;

      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const initialPathname = initialPathnameRef.current ?? '';
      const isPublicRoute = PUBLIC_ROUTES.includes(initialPathname);

      if (!token) {
        if (!isPublicRoute) router.replace('/login');
        finish();
        return;
      }

      const isTokenExpired = (): boolean => {
        const expiryStr = localStorage.getItem('tokenExpiry');
        if (!expiryStr) {
          const t = localStorage.getItem('accessToken');
          return !t;
        }
        return Date.now() >= parseInt(expiryStr, 10);
      };

      // Authentication (valid token) and authorization (admin access) are
      // resolved separately, and destination is only decided AFTER effective
      // permissions have loaded — never render/redirect on a stale or empty
      // permission snapshot from before this fetch.
      const resolveDestination = () => {
        const {
          permissions: p,
          globalCapabilities: c,
        } = useAuthStore.getState();
        const authorized = hasAnyAdminSignal(p, c);
        if (initialPathname === '/login') {
          router.replace(authorized ? '/dashboard' : '/unauthorized');
        } else if (!authorized && initialPathname !== '/unauthorized' && !isPublicRoute) {
          router.replace('/unauthorized');
        }
        finish();
      };

      if (refreshToken && isTokenExpired()) {
        const refreshed = await useAuthStore.getState().refreshAuth();
        if (!refreshed) {
          if (!isPublicRoute) router.replace('/login');
          finish();
          return;
        }
        resolveDestination();
      } else {
        await useAuthStore.getState().initAuth();
        resolveDestination();
      }
    };

    void runAuthCheck();
    return () => {
      cancelled = true;
    };
  }, [router, setLoading]);

  if (!checked || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
});

const ProvidersComponent = memo(function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthCheckComponent>{children}</AuthCheckComponent>
            <MfaGate />
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
});

export default ProvidersComponent;
