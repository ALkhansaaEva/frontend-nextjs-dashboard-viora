'use client';

import { useAuthStore } from '@/store';
import { can, hasAny, hasAll } from '@/lib/auth/permissions';

export function useHasPermission() {
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (permission: string): boolean => {
    if (!isAuthenticated) return false;
    return can(permissions, permission);
  };
}

export function useHasAnyPermission() {
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    return hasAny(permissions, requiredPermissions);
  };
}

export function useHasAllPermissions() {
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    return hasAll(permissions, requiredPermissions);
  };
}

export function useUserPermissions(): string[] {
  const permissions = useAuthStore((state) => state.permissions);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? permissions : [];
}

export function useCanAccessSection() {
  const hasPermission = useHasPermission();

  return (sectionPermission: string): boolean => {
    if (!sectionPermission) return true;
    return hasPermission(sectionPermission);
  };
}
