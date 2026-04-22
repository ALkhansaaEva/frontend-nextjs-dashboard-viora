import apiClient from './api.client';
import type { Permission } from '@/types/permissions';
import { PERMISSIONS } from '@/types/permissions';

export async function resolveUserPermissions(userId: string): Promise<Permission[]> {
  try {
    const userResponse = await apiClient.get<{ roles: { code: string; permissions?: string[] }[] }>(`/users/${userId}`);
    const userRoles = userResponse.roles || [];
    
    if (userRoles.length === 0) {
      return [];
    }

    const allPermissionsSet = new Set<Permission>();

    for (const role of userRoles) {
      try {
        const rolePermsResponse = await apiClient.get<{ permissions?: string[] }>(`/admin/roles/${role.code}/permissions`);
        const rolePerms = rolePermsResponse.permissions || [];
        
        for (const perm of rolePerms) {
          if (perm === '*') {
            return ['*'] as Permission[];
          }
          if (PERMISSIONS.includes(perm as Permission)) {
            allPermissionsSet.add(perm as Permission);
          }
        }
      } catch {
        console.warn(`Failed to fetch permissions for role: ${role.code}`);
      }
    }

    return Array.from(allPermissionsSet);
  } catch (error) {
    console.error('Failed to resolve user permissions:', error);
    return [];
  }
}

export function hasWildcardAccess(permissions: Permission[]): boolean {
  return permissions.includes('*');
}

export function canAccessDashboard(permissions: Permission[]): boolean {
  if (permissions.includes('*')) return true;
  if (permissions.includes('manage_config')) return true;
  return permissions.includes('dashboard.view');
}

export function isPermissionDenied(permissions: Permission[]): boolean {
  return permissions.length === 0;
}