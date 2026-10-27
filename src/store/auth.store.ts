import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthLoginResponse } from '@/types';
import type { PermissionResponse } from '@/types/auth.types';
import { authService } from '@/services';
import apiClient from '@/lib/api/api-client';
import type { GlobalCapabilities } from '@/lib/auth/permissions';
import { can } from '@/lib/auth/permissions';

export type UserRole = 'admin' | 'moderator' | 'manager' | 'user' | 'super_admin' | 'support';

function clearAuthCookies() {
  if (typeof window === 'undefined') return;
  document.cookie = 'accessToken=;path=/;max-age=0;SameSite=Lax';
  document.cookie = 'refreshToken=;path=/;max-age=0;SameSite=Lax';
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  support: 40,
  manager: 20,
  user: 10,
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  roles: UserRole[];
  permissions: string[];
  globalCapabilities: GlobalCapabilities | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (
    user: User,
    accessToken: string,
    refreshToken: string,
    roles: unknown[],
    permissions?: unknown[],
    expiresInSeconds?: number,
  ) => void;
  setUser: (user: User) => void;
  setRoles: (roles: UserRole[]) => void;
  setPermissions: (permissions: string[]) => void;
  setGlobalCapabilities: (caps: GlobalCapabilities) => void;
  login: (email: string, password: string) => Promise<void>;
  /** Passwordless email OTP sign-in; the verify endpoint returns a session. */
  loginWithOtp: (email: string, token: string) => Promise<void>;
  /** Establishes a session from an OAuth handoff id (Google sign-in). */
  loginWithGoogleSession: (session: AuthLoginResponse) => Promise<void>;
  fetchPermissions: () => Promise<void>;
  initAuth: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
  hasCapability: (capability: keyof GlobalCapabilities) => boolean;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  roles: [] as UserRole[],
  permissions: [] as string[],
  globalCapabilities: null as GlobalCapabilities | null,
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
};

function codeFrom(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  const candidate = value as { code?: unknown; name?: unknown };
  return typeof candidate.code === 'string'
    ? candidate.code
    : typeof candidate.name === 'string'
      ? candidate.name
      : '';
}

export function normalizeRoleCodes(values: unknown): UserRole[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .map(codeFrom)
    .map((role) => role.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean)
  )] as UserRole[];
}

export function normalizePermissionCodes(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values
    .map(codeFrom)
    .map((permission) => permission.trim().toLowerCase())
    .filter(Boolean)
  )];
}

export function jwtExpiryMs(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    const exp = Number(payload.exp);
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : null;
  } catch {
    return null;
  }
}

let authInitPromise: Promise<void> | null = null;

/**
 * Every sign-in path (password, email OTP, later OAuth) returns the same
 * `AuthLoginResponse`, so session establishment lives here instead of being
 * copied per flow.
 */
async function applyLoginSession(
  store: Pick<AuthState, 'setAuth' | 'fetchPermissions'>,
  response: AuthLoginResponse,
): Promise<void> {
  const safeUser: User = {
    id: response.user?.id ?? '',
    immutableUserId: response.user?.id ?? '',
    email: response.user?.email ?? '',
    nickname: response.user?.email?.split('@')[0] ?? 'User',
    status: 'active',
    roles: [],
    createdAt: new Date().toISOString(),
  };
  store.setAuth(
    safeUser,
    response.accessToken,
    response.refreshToken,
    response.roles ?? [],
    response.permissions ?? [],
    response.expiresIn,
  );
  try {
    await store.fetchPermissions();
  } catch {
    // non-critical — proceed with login-time permissions
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (
        user,
        accessToken,
        refreshToken,
        roles,
        permissions = [],
        expiresInSeconds,
      ) => {
        const safeRoles = normalizeRoleCodes(roles);
        const safePermissions = normalizePermissionCodes(permissions);
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          if (typeof accessToken === 'string') {
            const tokenExpiry = jwtExpiryMs(accessToken);
            const fallbackExpiry =
              Number.isFinite(expiresInSeconds) && Number(expiresInSeconds) > 0
                ? Date.now() + Number(expiresInSeconds) * 1000
                : null;
            const expiry = tokenExpiry ?? fallbackExpiry;
            if (expiry) localStorage.setItem('tokenExpiry', expiry.toString());
            else localStorage.removeItem('tokenExpiry');
          }
        }
        set({
          user,
          accessToken,
          refreshToken,
          roles: safeRoles,
          permissions: safePermissions,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          await applyLoginSession(
            get(),
            await authService.login({ email, password }),
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      loginWithOtp: async (email: string, token: string) => {
        set({ isLoading: true, error: null });
        try {
          await applyLoginSession(
            get(),
            await authService.verifyEmailOTP(email, token),
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      loginWithGoogleSession: async (session) => {
        set({ isLoading: true, error: null });
        try {
          await applyLoginSession(get(), session);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      setUser: (user) => set({ user }),

      setRoles: (roles) => set({ roles: normalizeRoleCodes(roles) }),

      setPermissions: (permissions) =>
        set({ permissions: normalizePermissionCodes(permissions) }),

      setGlobalCapabilities: (globalCapabilities) => set({ globalCapabilities }),

      fetchPermissions: async () => {
        try {
          const data = await apiClient.get<PermissionResponse>(
            '/users/me/permissions',
          );
          const perms = normalizePermissionCodes(data.permissions);
          const resolvedRoles = normalizeRoleCodes(data.roles);
          const caps = data.globalCapabilities ?? null;
          set({
            permissions: perms,
            roles: resolvedRoles.length > 0 ? resolvedRoles : get().roles,
            globalCapabilities: caps,
          });
        } catch {
          // permissions endpoint unavailable — use current state
        }
      },

      initAuth: async () => {
        if (authInitPromise) return authInitPromise;
        authInitPromise = (async () => {
          const { accessToken, isAuthenticated } = get();
          if (!accessToken || !isAuthenticated) return;
          set({ isLoading: true });
          try {
            const permissionData = await apiClient.get<PermissionResponse>(
              '/users/me/permissions',
            );
            const perms = normalizePermissionCodes(permissionData.permissions);
            const resolvedRoles = normalizeRoleCodes(permissionData.roles);
            const caps = permissionData.globalCapabilities;
            set({
              permissions: perms,
              roles: resolvedRoles.length > 0 ? resolvedRoles : get().roles,
              globalCapabilities: caps ?? null,
              isLoading: false,
            });
          } catch {
            set({ isLoading: false });
          }
        })();
        try {
          await authInitPromise;
        } finally {
          authInitPromise = null;
        }
      },

      refreshAuth: async () => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
          // Use the API client's single-flight refresh coordinator. Calling
          // authService.refreshToken here created a second independent refresh
          // path that could race the request interceptor and consume the same
          // rotating Supabase refresh token twice.
          const response = await apiClient.refreshAuthSession();
          const { accessToken, refreshToken: newRefresh, expiresIn, user: authUser, roles } = response;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefresh);
          if (expiresIn) {
            localStorage.setItem('tokenExpiry', (Date.now() + expiresIn * 1000).toString());
          }
          const safeUser: User = {
            id: authUser?.id ?? '',
            immutableUserId: authUser?.id ?? '',
            email: authUser?.email ?? '',
            nickname: authUser?.email?.split('@')[0] ?? 'User',
            status: 'active',
            roles: [],
            createdAt: new Date().toISOString(),
          };
          get().setAuth(
            safeUser,
            accessToken,
            newRefresh,
            roles ?? [],
            [],
            expiresIn,
          );
          await get().initAuth();
          return true;
        } catch {
          get().clearAuth();
          return false;
        }
      },

      logout: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (token) await authService.logout();
        } catch {
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('tokenExpiry');
            sessionStorage.clear();
            clearAuthCookies();
            window.location.replace('/login');
          }
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('auth-storage');
          localStorage.removeItem('tokenExpiry');
          sessionStorage.clear();
          clearAuthCookies();
          window.location.replace('/login');
        }
      },

      hasPermission: (permission) => {
        const { permissions } = get();
        return can(permissions, permission);
      },

      hasRole: (role) => {
        const { roles } = get();
        const targetRoles = Array.isArray(role) ? role : [role];
        return roles.some((r) => targetRoles.includes(r));
      },

      hasMinRole: (minRole) => {
        const { roles } = get();
        const minLevel = ROLE_HIERARCHY[minRole];
        return roles.some((role) => (ROLE_HIERARCHY[role] ?? 0) >= minLevel);
      },

      hasCapability: (capability) => {
        const { globalCapabilities } = get();
        return globalCapabilities?.[capability] ?? false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        roles: state.roles,
        permissions: state.permissions,
        globalCapabilities: state.globalCapabilities,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
