import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';
import { authService } from '@/services';

export type UserRole = 'admin' | 'moderator' | 'manager' | 'user' | 'super_admin' | 'support';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string, roles: UserRole[], permissions?: string[]) => void;
  setUser: (user: User) => void;
  setRoles: (roles: UserRole[]) => void;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasMinRole: (minRole: UserRole) => boolean;
}

const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  roles: [] as UserRole[],
  permissions: [] as string[],
  isAuthenticated: false,
  isLoading: false,
  error: null as string | null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAuth: (user, accessToken, refreshToken, roles, permissions = []) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        
        set({
          user,
          accessToken,
          refreshToken,
          roles,
          permissions,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      setUser: (user) => set({ user }),

      setRoles: (roles) => set({ roles }),

      logout: async () => {
        try {
          const token = localStorage.getItem('accessToken');
          if (token) {
            await authService.logout();
          }
        } catch {
        } finally {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth-storage');
            localStorage.removeItem('tokenExpiry');
            sessionStorage.clear();
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
          window.location.replace('/login');
        }
      },

      hasPermission: (permission) => {
        const { permissions, roles } = get();
        // If user has super_admin or admin role, they have all permissions
        if (roles.includes('super_admin') || roles.includes('admin')) {
          return true;
        }
        if (permissions.includes('*')) return true;
        if (permissions.includes('manage_config')) return true;
        if (permission === 'dashboard.view') return true;
        return permissions.includes(permission);
      },

      hasRole: (role) => {
        const { roles } = get();
        const targetRoles = Array.isArray(role) ? role : [role];
        return roles.some(r => targetRoles.includes(r));
      },

      hasMinRole: (minRole) => {
        const { roles } = get();
        const minLevel = ROLE_HIERARCHY[minRole];
        return roles.some(role => (ROLE_HIERARCHY[role] || 0) >= minLevel);
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
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;