export interface GlobalCapabilities {
  canModerateAllRooms: boolean;
  canAccessAdminPanel: boolean;
  canManageUsers: boolean;
  canManageRooms: boolean;
  canAccessVoice: boolean;
  canCreateRooms: boolean;
}

export interface PermissionResponse {
  userId: string;
  roles: string[];
  permissions: string[];
  roomMemberships: unknown[];
  globalCapabilities: GlobalCapabilities;
}

function normalize(perm: string): string {
  return perm.toLowerCase().trim();
}

function matchWildcard(pattern: string, target: string): boolean {
  if (pattern === target) return true;
  if (!pattern.endsWith('.*')) return false;
  const prefix = pattern.slice(0, -2);
  return target === prefix || target.startsWith(prefix + '.');
}

/** Codes that grant unconditional access to every gated check (super-admin escape hatch). */
const ADMIN_BYPASS = ['admin.all', 'admin.full_access'];

export function can(userPerms: string[], permission: string): boolean {
  if (!userPerms || userPerms.length === 0) return false;
  if (userPerms.some((p) => ADMIN_BYPASS.includes(normalize(p)))) return true;
  const target = normalize(permission);
  return userPerms.some((p) => matchWildcard(normalize(p), target));
}

export function cannot(userPerms: string[], permission: string): boolean {
  return !can(userPerms, permission);
}

export function hasAny(userPerms: string[], permissions: string[]): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.some((p) => can(userPerms, p));
}

export function hasAll(userPerms: string[], permissions: string[]): boolean {
  if (!permissions || permissions.length === 0) return true;
  return permissions.every((p) => can(userPerms, p));
}

export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}

/**
 * A valid session (authentication) is not the same as being an Admin Dashboard
 * operator (authorization). A player account with no admin permissions and no
 * staff role must not be treated as authorized just because it has a token.
 */
export function hasAnyAdminSignal(userPerms: string[], userRoles: string[]): boolean {
  return userPerms.length > 0 || userRoles.some((r) => r !== 'user');
}

export function hasCapability(
  caps: GlobalCapabilities | null | undefined,
  capability: keyof GlobalCapabilities,
): boolean {
  return caps?.[capability] ?? false;
}
