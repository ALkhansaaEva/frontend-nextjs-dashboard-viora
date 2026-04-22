'use client';

import { useEffect, useState, memo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { LanguageProvider } from '@/components/language-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services';

const PUBLIC_ROUTES = ['/login', '/'];

const AuthCheckComponent = memo(function AuthCheck({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, setLoading, setAuth } = useAuthStore();
  const [checked, setChecked] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshSession = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    
    try {
      const response = await authService.refreshToken(refreshToken);
      
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      if (response.expiresIn) {
        const expiryTime = Date.now() + (response.expiresIn * 1000);
        localStorage.setItem('tokenExpiry', expiryTime.toString());
      }
      
      const user = {
        id: response.user?.id || '',
        immutableUserId: response.user?.id || '',
        email: response.user?.email || '',
        nickname: response.user?.email?.split('@')[0] || 'User',
        status: 'active' as const,
        roles: [],
        createdAt: new Date().toISOString(),
      };
      const userRoles = (response.roles || []) as never[];
      const userPermissions = response.permissions || [];
      
      setAuth(user, response.accessToken, response.refreshToken, userRoles, userPermissions);
      setChecked(true);
      setLoading(false);
      
      return true;
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return false;
    }
  };

  const isTokenExpired = (): boolean => {
    const expiryStr = localStorage.getItem('tokenExpiry');
    if (!expiryStr) {
      const token = localStorage.getItem('accessToken');
      return !token;
    }
    const expiry = parseInt(expiryStr, 10);
    return Date.now() >= expiry;
  };

  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');

    if (!token && !isPublicRoute) {
      router.push('/login');
      setChecked(true);
      setLoading(false);
      return;
    }

    if (token && pathname === '/login') {
      router.push('/dashboard');
      setChecked(true);
      setLoading(false);
      return;
    }

    if (token && refreshToken && isTokenExpired()) {
      refreshSession().then(refreshed => {
        if (!refreshed && !isPublicRoute) {
          router.push('/login');
        }
      });
    } else {
      setChecked(true);
      setLoading(false);
    }
  }, [pathname, mounted]);

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
          </LanguageProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
});

export default ProvidersComponent;