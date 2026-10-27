'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import { can } from '@/lib/auth/permissions';

interface AuthGuardProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, loadingComponent }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated) {
    return (
      loadingComponent ?? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    );
  }

  return <>{children}</>;
}

interface PermissionProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: ReactNode;
  loading?: ReactNode;
  children: ReactNode;
}

export function Permission({
  permission,
  anyOf,
  allOf,
  fallback = null,
  loading = null,
  children,
}: PermissionProps) {
  const { permissions: userPerms, isLoading } = useAuthStore();

  if (isLoading) return <>{loading}</>;

  const hasAccess = permission
    ? can(userPerms, permission)
    : anyOf
      ? anyOf.some((p) => can(userPerms, p))
      : allOf
        ? allOf.every((p) => can(userPerms, p))
        : true;

  if (!hasAccess) return <>{fallback}</>;

  return <>{children}</>;
}

export default AuthGuard;
