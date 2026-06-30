'use client';

import { useAuthStore, type UserRole } from '@/store/auth.store';
import { can, hasAny, hasAll, hasCapability } from '@/lib/auth/permissions';
import type { GlobalCapabilities } from '@/lib/auth/permissions';
import type { User } from '@/types';

export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    accessToken: store.accessToken,
    refreshToken: store.refreshToken,
    roles: store.roles,
    permissions: store.permissions,
    globalCapabilities: store.globalCapabilities,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login: (email: string, password: string) => store.login(email, password),
    setAuth: store.setAuth,
    logout: store.logout,
    refreshSession: store.refreshAuth,
    initAuth: store.initAuth,
    fetchPermissions: store.fetchPermissions,
    clearAuth: store.clearAuth,
  };
}

export function useCurrentUser(): User | null {
  return useAuthStore((s) => s.user);
}

export function useRoles(): UserRole[] {
  return useAuthStore((s) => s.roles);
}

export function usePermissions(): string[] {
  return useAuthStore((s) => s.permissions);
}

export function useGlobalCapabilities(): GlobalCapabilities | null {
  return useAuthStore((s) => s.globalCapabilities);
}

export function useCan(permission: string): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return can(permissions, permission);
}

export function useHasAny(required: string[]): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return hasAny(permissions, required);
}

export function useHasAll(required: string[]): boolean {
  const permissions = useAuthStore((s) => s.permissions);
  return hasAll(permissions, required);
}

export function useCapability(capability: keyof GlobalCapabilities): boolean {
  const caps = useAuthStore((s) => s.globalCapabilities);
  return hasCapability(caps, capability);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}
