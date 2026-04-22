'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { authService } from '@/services';
import { useAuthStore, type UserRole } from '@/store';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    '*', 'manage_users', 'view_users', 'manage_roles', 'manage_permissions',
    'adjust_balance', 'view_transactions', 'global_ban', 'global_mute',
    'view_audit_logs', 'manage_reports', 'manage_tickets', 'manage_all_rooms',
    'manage_games', 'manage_config', 'dashboard.view',
    'room_kick_user', 'room_mute_user', 'room_ban_user', 'room_manage_mic',
    'room_assign_role', 'room_edit_settings', 'room_manage_members',
    'room_edit_name', 'room_edit_slogan', 'room_invite_user'
  ],
  admin: [
    'manage_users', 'view_users', 'manage_roles', 'manage_permissions',
    'adjust_balance', 'view_transactions', 'global_ban', 'global_mute',
    'view_audit_logs', 'manage_reports', 'manage_tickets', 'manage_all_rooms',
    'manage_games', 'manage_config', 'dashboard.view',
    'room_kick_user', 'room_mute_user', 'room_ban_user', 'room_manage_mic',
    'room_assign_role', 'room_edit_settings', 'room_manage_members',
    'room_edit_name', 'room_edit_slogan', 'room_invite_user'
  ],
  moderator: [
    'view_users', 'global_ban', 'global_mute', 'view_audit_logs',
    'manage_reports', 'manage_tickets', 'dashboard.view',
    'room_kick_user', 'room_mute_user', 'room_ban_user', 'room_manage_mic'
  ],
  support: [
    'view_users', 'manage_tickets', 'view_transactions', 'dashboard.view'
  ],
  manager: [
    'view_users', 'adjust_balance', 'view_transactions', 'dashboard.view',
    'room_manage_members', 'room_edit_name', 'room_edit_slogan', 'room_invite_user'
  ],
  user: ['dashboard.view']
};

const VALID_ROLES = ['super_admin', 'admin', 'moderator', 'support', 'manager', 'user'];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, isAuthenticated: authState } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [navigated, setNavigated] = useState(false);

  useEffect(() => {
    if (authState && !navigated) {
      setNavigated(true);
      router.push('/dashboard');
    }
  }, [authState, router, navigated]);

  const DEFAULT_PERMISSIONS = ['dashboard.view'];
const resolvePermissions = (roleCodes: string[]): string[] => {
    const permissions = new Set<string>();
    
    for (const role of roleCodes) {
      const perms = ROLE_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS;
      perms.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const response = await authService.login({ email, password });
      console.log('Login response:', response);
      
      if (!response.accessToken) {
        throw new Error('No access token in response');
      }
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
      }
      
      const roleCodes = response.roles || [];
      const permissions = resolvePermissions(roleCodes);
      
      const roles: UserRole[] = roleCodes.map((r: string) => {
        if (VALID_ROLES.includes(r)) return r as UserRole;
        return 'user' as UserRole;
      });
      
      const user = {
        id: response.user.id,
        immutableUserId: response.user.id,
        email: response.user.email,
        nickname: response.user.email?.split('@')[0] || 'User',
        status: 'active' as const,
        roles: [],
        createdAt: new Date().toISOString(),
      };
      
      setAuth(user, response.accessToken, response.refreshToken, roles, permissions);
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Viora Admin</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}