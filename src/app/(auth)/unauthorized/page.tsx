'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { hasAnyAdminSignal } from '@/lib/auth/permissions';

export default function UnauthorizedPage() {
  const { permissions, roles, isAuthenticated, logout } = useAuthStore();
  // A zero-permission account (e.g. a normal player who ended up here) has
  // nowhere useful to go inside the Admin Dashboard — "Back to Dashboard"
  // would just bounce them straight back to this same page. Only offer it
  // when the account actually has some admin access somewhere else.
  const hasSomeAdminAccess = isAuthenticated && hasAnyAdminSignal(permissions, roles);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldAlert className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          403 - Unauthorized
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {hasSomeAdminAccess
            ? "You do not have permission to access this page. If you believe this is an error, please contact your administrator."
            : 'This account is authenticated but does not have permission to access the VIORA administrative dashboard.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {hasSomeAdminAccess ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          ) : (
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          )}

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
