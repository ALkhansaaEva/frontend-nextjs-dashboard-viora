'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, clearAuth, error: storeError, isLoading: storeLoading } = useAuthStore();
  const [error, setError] = useState('');

  const checkAuth = useCallback(() => {
    if (!isAuthenticated) return;
    const expiry = typeof window !== 'undefined' ? localStorage.getItem('tokenExpiry') : null;
    if (expiry && Date.now() < parseInt(expiry)) {
      router.replace('/dashboard');
    } else {
      clearAuth();
    }
  }, [isAuthenticated, router, clearAuth]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : 'Login failed';
      setError(message);
    }
  };

  const displayError = error || storeError;

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input name="email" type="email" placeholder="admin@example.com" className="pl-10" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input name="password" type="password" placeholder="••••••••" className="pl-10" required />
              </div>
            </div>

            {displayError && <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>}

            <Button type="submit" className="w-full" disabled={storeLoading}>
              {storeLoading ? (
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
