'use client';

import { useAuthStore } from '@/store';

type PermissionFormat = string[] | Record<string, number> | Array<{ code?: string }>;

function normalizePermissions(permissions: PermissionFormat): string[] {
  if (!permissions) return [];
  
  // If it's a Record<string, number> (like { "manage_users": 1, ... })
  if (!Array.isArray(permissions)) {
    return Object.keys(permissions);
  }
  
  // If it's Permission[] (with code property)
  if (permissions.length > 0 && typeof permissions[0] === 'object' && 'code' in (permissions[0] as Record<string, unknown>)) {
    return (permissions as Array<{ code: string }>).map(p => p.code);
  }
  
  // If it's string[]
  return permissions as string[];
}

export function useHasPermission() {
  const permissions = useAuthStore(state => state.permissions);
  const roles = useAuthStore(state => state.roles);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const normalizedPermissions = normalizePermissions(permissions);
  
  return (permission: string): boolean => {
    if (!isAuthenticated) return false;
    
    // If user has super_admin or admin role, they have all permissions
    if (roles.includes('super_admin') || roles.includes('admin')) {
      return true;
    }
    
    if (normalizedPermissions.length === 0) return false;
    
    // Wildcard gives all permissions
    if (normalizedPermissions.includes('*')) return true;
    
    // Check for exact match
    if (normalizedPermissions.includes(permission)) return true;
    
    // Check if permission is a prefix (e.g., "manage_" matches "manage_users")
    const hasPrefixMatch = normalizedPermissions.some(p => 
      permission.startsWith(p + '.') || p === permission.split('.')[0]
    );
    
    return hasPrefixMatch;
  };
}

export function useHasAnyPermission() {
  const permissions = useAuthStore(state => state.permissions);
  const roles = useAuthStore(state => state.roles);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const normalizedPermissions = normalizePermissions(permissions);
  
  return (requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    
    if (roles.includes('super_admin') || roles.includes('admin')) {
      return true;
    }
    
    if (normalizedPermissions.length === 0) return false;
    
    if (normalizedPermissions.includes('*')) return true;
    
    return requiredPermissions.some(perm => normalizedPermissions.includes(perm));
  };
}

export function useHasAllPermissions() {
  const permissions = useAuthStore(state => state.permissions);
  const roles = useAuthStore(state => state.roles);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const normalizedPermissions = normalizePermissions(permissions);
  
  return (requiredPermissions: string[]): boolean => {
    if (!isAuthenticated) return false;
    
    if (roles.includes('super_admin') || roles.includes('admin')) {
      return true;
    }
    
    if (normalizedPermissions.length === 0) return false;
    
    if (normalizedPermissions.includes('*')) return true;
    
    return requiredPermissions.every(perm => normalizedPermissions.includes(perm));
  };
}

export function useUserPermissions(): string[] {
  const permissions = useAuthStore(state => state.permissions);
  const roles = useAuthStore(state => state.roles);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  const normalizedPermissions = normalizePermissions(permissions);
  
  // If user has admin role, return wildcard to indicate all permissions
  if (isAuthenticated && (roles.includes('super_admin') || roles.includes('admin'))) {
    return normalizedPermissions.length > 0 ? normalizedPermissions : ['*'];
  }
  
  return normalizedPermissions;
}

export function useCanAccessSection() {
  const hasPermission = useHasPermission();
  
  return (sectionPermission: string): boolean => {
    if (!sectionPermission) return true; // No permission required
    return hasPermission(sectionPermission);
  };
}