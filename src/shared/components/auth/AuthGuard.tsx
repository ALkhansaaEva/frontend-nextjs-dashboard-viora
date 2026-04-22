'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store';
import type { Permission } from '@/types/permissions';
import { hasPermission, canAccessDashboard, hasWildcardAccess } from '@/types/permissions';

interface AuthGuardProps {
  children: ReactNode;
  permissions?: Permission[];
  loadingComponent?: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({
  children,
  permissions = [],
  loadingComponent,
  fallback
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, permissions: userPermissions } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    setChecked(true);

    if (!isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
      return;
    }

    const perms = userPermissions as Permission[] | undefined;

    if (permissions.length > 0 && perms) {
      const hasAccess = perms.includes('*') || 
        permissions.some(perm => hasPermission(perms, perm));
      
      if (!hasAccess && fallback) {
        return;
      }
      
      if (!hasAccess) {
        router.push('/dashboard?unauthorized=true');
      }
    }
  }, [isAuthenticated, isLoading, permissions, userPermissions, pathname, router, fallback]);

  if (isLoading || !checked) {
    return loadingComponent || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const perms = userPermissions as Permission[] | undefined;

  if (permissions.length > 0 && perms) {
    const hasAccess = perms.includes('*') || 
      permissions.some(perm => hasPermission(perms, perm));
    
    if (!hasAccess) {
      return fallback || null;
    }
  }

  return <>{children}</>;
}

export function useDashboardAccess() {
  const { permissions: userPermissions, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const perms = userPermissions as Permission[] | undefined;
  
  const canAccess = isAuthenticated && !isLoading && canAccessDashboard(perms || []);
  const hasWildcard = isAuthenticated && !isLoading && hasWildcardAccess(perms || []);
  const isDenied = isAuthenticated && !isLoading && (perms || []).length === 0;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!canAccessDashboard(perms || [])) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}&denied=true`);
      }
    }
  }, [isAuthenticated, isLoading, perms, pathname, router, canAccess]);

  return {
    canAccess,
    hasWildcard,
    isDenied,
    isLoading,
  };
}

export function PermissionGate({
  permission,
  children,
  fallback = null
}: {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { permissions: userPermissions, isLoading } = useAuthStore();
  const perms = userPermissions as Permission[] | undefined;

  if (isLoading) {
    return null;
  }

  const hasAccess = perms?.includes('*') || 
    perms?.includes(permission) ||
    perms?.includes('manage_config');

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function AnyPermissionGate({
  permissions: requiredPerms,
  children,
  fallback = null
}: {
  permissions: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { permissions: userPermissions, isLoading } = useAuthStore();
  const perms = userPermissions as Permission[] | undefined;

  if (isLoading) {
    return null;
  }

  const hasAccess = perms?.includes('*') || 
    requiredPerms.some(p => perms?.includes(p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export default AuthGuard;