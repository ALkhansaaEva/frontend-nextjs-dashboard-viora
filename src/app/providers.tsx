'use client';

import { useEffect, useState, memo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LanguageProvider } from '@/components/language-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/store/auth.store';
import { Toaster } from '@/shared/components/ui/Toaster';
import { hasAnyAdminSignal } from '@/lib/auth/permissions';

const PUBLIC_ROUTES = ['/login', '/'];

const AuthCheckComponent = memo(function AuthCheck({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, setLoading } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname ?? '');

    if (!token && !isPublicRoute) {
      router.push('/login');
      setChecked(true);
      setLoading(false);
      return;
    }

    if (token) {
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
        const { permissions: p, roles: r } = useAuthStore.getState();
        const authorized = hasAnyAdminSignal(p, r);
        if (pathname === '/login') {
          router.push(authorized ? '/dashboard' : '/unauthorized');
        } else if (!authorized && pathname !== '/unauthorized' && !isPublicRoute) {
          router.push('/unauthorized');
        }
        setChecked(true);
        setLoading(false);
      };

      if (refreshToken && isTokenExpired()) {
        useAuthStore.getState().refreshAuth().then((refreshed) => {
          if (!refreshed && !isPublicRoute) {
            router.push('/login');
            setChecked(true);
            setLoading(false);
            return;
          }
          resolveDestination();
        });
      } else {
        useAuthStore.getState().initAuth().finally(resolveDestination);
      }
    } else {
      setChecked(true);
      setLoading(false);
    }
  }, [pathname, mounted, router, setLoading]);

  if (!mounted || !checked || isLoading) {
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
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
});

export default ProvidersComponent;
