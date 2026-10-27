export interface User {
  id: string;
  immutableUserId: string;
  email: string;
  nickname: string;
  title?: string;
  status: 'active' | 'suspended' | 'banned';
  roles: Role[];
  createdAt: string;
  lastLogin?: string;
  wallet?: Wallet;
  avatar?: string;
}

/** Mirrors backend `Wallet` entity — GAME_CURRENCY is the sole canonical
 * currency, kept as a string end-to-end for numeric(30,0) precision. */
export interface Wallet {
  userId: string;
  gameCurrency: string;
}

export interface Role {
  id: string;
  code: string;
  name?: string | null;
  isSystem?: boolean | null;
  scope?: string | null;
  priority?: number | string | null;
  level?: number | string | null;
  description?: string | null;
  permissions?: string[] | null;
  permissionsMask?: string | null;
  inheritsFrom?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GlobalCapabilities {
  canAccessAdminPanel: boolean;
  canManageUsers: boolean;
  canManageRooms: boolean;
  canModerateAllRooms: boolean;
  canAccessVoice: boolean;
  canCreateRooms: boolean;
  [key: string]: boolean;
}

export type UserRole = 'super_admin' | 'admin' | 'moderator' | 'support' | 'manager' | 'user';

export interface PermissionResponse {
  userId: string;
  roles: string[];
  permissions: string[];
  globalCapabilities: GlobalCapabilities;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  roles: UserRole[];
  permissions: string[];
  globalCapabilities: GlobalCapabilities | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  initAuth: () => Promise<void>;
  fetchPermissions: () => Promise<void>;
  setUser: (user: User) => void;
  setRoles: (roles: UserRole[]) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
  hasCapability: (capability: keyof GlobalCapabilities) => boolean;
}
