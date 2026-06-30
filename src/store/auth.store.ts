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
  setAuth: (user: User, accessToken: string, refreshToken: string, roles: string[], permissions?: string[]) => void;
  setUser: (user: User) => void;
  setRoles: (roles: UserRole[]) => void;
  setPermissions: (permissions: string[]) => void;
  setGlobalCapabilities: (caps: GlobalCapabilities) => void;
  login: (email: string, password: string) => Promise<void>;
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

let authInitPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (user, accessToken, refreshToken, roles, permissions = []) => {
        const safeRoles = roles.filter((r): r is UserRole =>
          ['admin', 'moderator', 'manager', 'user', 'super_admin', 'support'].includes(r),
        ) as UserRole[];
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          if (typeof accessToken === 'string') {
            try {
              const payload = JSON.parse(atob(accessToken.split('.')[1] ?? ''));
              if (payload.exp) {
                localStorage.setItem('tokenExpiry', (payload.exp * 1000).toString());
              }
            } catch { /* ignore */ }
            const maxAge = 60 * 60 * 24 * 7;
            document.cookie =
              `accessToken=${encodeURIComponent(accessToken)};path=/;max-age=${maxAge};SameSite=Lax`;
            document.cookie =
              `refreshToken=${encodeURIComponent(refreshToken ?? '')};path=/;max-age=${maxAge};SameSite=Lax`;
          }
        }
        set({
          user,
          accessToken,
          refreshToken,
          roles: safeRoles,
          permissions,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password }) as AuthLoginResponse;
          const { accessToken, refreshToken, roles, permissions: loginPerms } = response;
          const safeUser: User = {
            id: response.user?.id ?? '',
            immutableUserId: response.user?.id ?? '',
            email: response.user?.email ?? '',
            nickname: response.user?.email?.split('@')[0] ?? 'User',
            status: 'active',
            roles: [],
            createdAt: new Date().toISOString(),
          };
          const assignRoles = (roles ?? []) as UserRole[];
          get().setAuth(safeUser, accessToken, refreshToken, assignRoles, loginPerms ?? []);
          try {
            await get().fetchPermissions();
          } catch {
            // non-critical — proceed with login-time permissions
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed';
          set({ isLoading: false, error: message });
          throw err;
        }
      },

      setUser: (user) => set({ user }),

      setRoles: (roles) => set({ roles }),

      setPermissions: (permissions) => set({ permissions }),

      setGlobalCapabilities: (globalCapabilities) => set({ globalCapabilities }),

      fetchPermissions: async () => {
        try {
          const data = await apiClient.get<any>('/users/me/permissions') as PermissionResponse;
          const perms = data.permissions ?? [];
          const caps = data.globalCapabilities ?? null;
          set({
            permissions: perms,
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
            const data = await apiClient.get<any>('/users/me/permissions');
            const perms = (data as { permissions?: string[] }).permissions ?? [];
            const caps = (data as { globalCapabilities?: GlobalCapabilities }).globalCapabilities;
            set({
              permissions: perms,
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
          const response = await authService.refreshToken(refreshToken);
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
          const currentRoles = roles ?? [];
          get().setAuth(safeUser, accessToken, newRefresh, currentRoles);
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
