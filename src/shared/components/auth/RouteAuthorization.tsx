'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { can, hasAny, hasAll } from '@/lib/auth/permissions';
import { matchAdminRoute } from '@/lib/admin/admin-routes';

/**
 * Route-level authorization gate for the entire /dashboard tree.
 *
 * Sidebar-only filtering is not enforcement — a user can always type a URL
 * directly. This component looks up the current pathname in the central
 * admin route registry (`src/lib/admin/admin-routes.ts`) and enforces the
 * SAME permission requirements the Sidebar uses to decide what to show,
 * so there is exactly one source of truth for "who can see this page".
 *
 * Unauthenticated  → /login?redirect=<path>
 * Authenticated but missing required permission(s) → /unauthorized
 * Authorized (or route has no permission requirement) → render children
 *
 * The backend remains the final authorization authority — this only
 * prevents an unauthorized user from *reaching* a page whose data calls
 * would be rejected anyway; it does not replace backend permission checks.
 */
export function RouteAuthorization({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, permissions } = useAuthStore();

  const route = matchAdminRoute(pathname);
  const required = route?.requiredPermissions ?? [];
  const matchMode = route?.matchMode ?? 'any';
  const authorized =
    required.length === 0 ||
    (matchMode === 'all' ? hasAll(permissions, required) : hasAny(permissions, required));

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!authorized) {
      router.replace('/unauthorized');
    }
  }, [isLoading, isAuthenticated, authorized, pathname, router]);

  if (isLoading || !isAuthenticated || !authorized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

/** Hook form for gating a single UI element (button/section) against a route's own page-level rules. */
export function useRoutePermission(permission: string): boolean {
  const { permissions } = useAuthStore();
  return can(permissions, permission);
}

export default RouteAuthorization;
