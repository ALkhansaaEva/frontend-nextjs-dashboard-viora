import apiClient from './api.client';
import type { Permission } from '@/types/permissions';
import { PERMISSIONS } from '@/types/permissions';

export async function resolveUserPermissions(userId: string): Promise<Permission[]> {
  try {
    const roleCodes = await apiClient.get<string[]>(`/admin/users/${userId}/roles`);
    const roleList = Array.isArray(roleCodes) ? roleCodes : [];

    if (roleList.length === 0) return [];

    const allPermissionsSet = new Set<Permission>();

    for (const roleCode of roleList) {
      try {
        const rolePermsResponse = await apiClient.get<string[]>(`/admin/roles/${roleCode}/permissions`);
        const rolePerms = Array.isArray(rolePermsResponse) ? rolePermsResponse : [];

        for (const perm of rolePerms) {
          if (perm === '*') return ['*'] as Permission[];
          if (PERMISSIONS.includes(perm as Permission)) {
            allPermissionsSet.add(perm as Permission);
          }
        }
      } catch {
        console.warn(`Failed to fetch permissions for role: ${roleCode}`);
      }
    }

    return Array.from(allPermissionsSet);
  } catch (error) {
    console.error('Failed to resolve user permissions:', error);
    return [];
  }
}
