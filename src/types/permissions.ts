export type Permission = string;

export const PERMISSIONS: Permission[] = [];

export const PERMISSION_GROUPS: Record<string, Permission[]> = {};

export const SECTION_PERMISSIONS: Record<string, Permission> = {};

export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('manage_config')) return true;
  return userPermissions.includes(required);
}

export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('manage_config')) return true;
  return required.some(perm => userPermissions.includes(perm));
}

export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*') || userPermissions.includes('manage_config')) return true;
  return required.every(perm => userPermissions.includes(perm));
}

export function hasWildcardAccess(userPermissions: Permission[]): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes('*');
}

export function canAccessDashboard(userPermissions: Permission[]): boolean {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes('manage_config')) return true;
  return userPermissions.includes('dashboard.view');
}

export function isPermissionDenied(userPermissions: Permission[]): boolean {
  return !userPermissions || userPermissions.length === 0;
}

export function getEffectivePermissions(rolePermissions: Permission[], allPermissions: Permission[]): Permission[] {
  if (!rolePermissions || rolePermissions.length === 0) return [];
  if (!allPermissions || allPermissions.length === 0) return rolePermissions;
  
  const effective = new Set<Permission>();
  
  if (rolePermissions.includes('*')) {
    allPermissions.forEach(p => effective.add(p));
    return Array.from(effective);
  }
  
  rolePermissions.forEach(p => effective.add(p));
  return Array.from(effective);
}

export function getPermissionCategory(permission: Permission): string {
  if (!permission) return 'other';
  
  const prefix = permission.split('_')[0] || '';
  const categoryMap: Record<string, string> = {
    manage: 'management',
    view: 'view',
    global: 'moderation',
    room: 'rooms',
    adjust: 'finance',
  };
  
  return categoryMap[prefix] || 'other';
}

export function getPermissionType(permission: string): { color: string; bgGradient: string; label: string } {
  const lowerCode = permission.toLowerCase();
  
  if (lowerCode.includes('manage')) return { color: 'text-red-500', bgGradient: 'from-red-500/20 to-orange-500/20', label: 'Manage' };
  if (lowerCode.includes('view')) return { color: 'text-blue-500', bgGradient: 'from-blue-500/20 to-cyan-500/20', label: 'View' };
  if (lowerCode.includes('global')) return { color: 'text-orange-500', bgGradient: 'from-orange-500/20 to-amber-500/20', label: 'Global' };
  if (lowerCode.includes('room_')) return { color: 'text-purple-500', bgGradient: 'from-purple-500/20 to-indigo-500/20', label: 'Room' };
  if (lowerCode.includes('adjust') || lowerCode.includes('balance') || lowerCode.includes('transaction')) return { color: 'text-green-500', bgGradient: 'from-green-500/20 to-emerald-500/20', label: 'Finance' };
  
  return { color: 'text-gray-500', bgGradient: 'from-gray-500/20 to-slate-500/20', label: 'Other' };
}