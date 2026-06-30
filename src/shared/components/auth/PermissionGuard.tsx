'use client';

import { useAuthStore, type UserRole } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { can } from '@/lib/auth/permissions';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  roles?: UserRole[];
  minRole?: UserRole;
  fallback?: ReactNode;
  onUnauthorized?: () => void;
}

export function PermissionGuard({
  children,
  permission,
  roles,
  minRole,
  fallback = null,
  onUnauthorized,
}: PermissionGuardProps) {
  const { permissions: userPerms, hasRole, hasMinRole, isAuthenticated } = useAuthStore();
  const router = useRouter();

  const authorized =
    isAuthenticated &&
    ((permission && can(userPerms, permission)) ||
      (roles && hasRole(roles)) ||
      (minRole && hasMinRole(minRole)) ||
      (!permission && !roles && !minRole));

  useEffect(() => {
    if (!authorized && onUnauthorized) onUnauthorized();
    if (!authorized && !isAuthenticated) router.push('/login');
  }, [authorized, isAuthenticated, router, onUnauthorized]);

  if (!authorized) return <>{fallback}</>;

  return <>{children}</>;
}

interface RoleRouteGuardProps {
  children: ReactNode;
  requiredRoles: UserRole[];
  redirectTo?: string;
}

export function RoleRouteGuard({ children, requiredRoles, redirectTo = '/dashboard' }: RoleRouteGuardProps) {
  const { hasRole, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRole(requiredRoles)) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, hasRole, requiredRoles, redirectTo, router]);

  if (!isAuthenticated || isLoading) return null;

  if (!hasRole(requiredRoles)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Unauthorized</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function usePermission(permission: string): boolean {
  const { permissions } = useAuthStore();
  return can(permissions, permission);
}

export function useRoleCheck(roles: UserRole | UserRole[]): boolean {
  return useAuthStore((state) => state.hasRole(Array.isArray(roles) ? roles : [roles]));
}

export default PermissionGuard;
