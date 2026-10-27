'use client';

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Moon, 
  Sun, 
  Menu, 
  Bell,
  CheckCheck,
  LogOut,
  Settings,
  Globe,
  Inbox
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { useLanguage } from '@/components/language-context';
import { useVioraTheme } from '@/components/providers/theme-provider';
import { useSidebarStore } from '@/store/sidebar.store';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/Button';
import { QueryState } from '@/shared/components/ui/QueryState';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/hooks/useNotifications';

const BELL_PREVIEW_LIMIT = 5;

interface HeaderProps {
  className?: string;
}

function HeaderComponent({ className }: HeaderProps) {
  const { isDark, toggleTheme } = useVioraTheme();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useLanguage();
  const { openMobile } = useSidebarStore();
  
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleToggleLanguage = useCallback(() => {
    setLocale(locale === 'en' ? 'ar' : 'en');
  }, [locale, setLocale]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <header
      className={cn(
        "fixed top-0 start-0 end-0 z-50 h-16 transition-all duration-300 ease-out",
        isScrolled 
          ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/20 border-b border-gray-200/20 dark:border-gray-700/30" 
          : "bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border-b border-white/10 dark:border-gray-700/20",
        className
      )}
    >
      <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={openMobile}
            className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="text-white font-bold text-base">V</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
              Viora
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <NotificationBell />

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>

          <button
            onClick={handleToggleLanguage}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
              {locale}
            </span>
          </button>

          <Link
            href="/dashboard/settings"
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 p-1.5 ps-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Profile"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">
                {user?.nickname?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden lg:block">
              {user?.nickname || 'Admin'}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 active:scale-95"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Bell + panel. The unread count comes from the `GET /notifications` envelope
 * (there is no separate unread-count route), so a failed request must render
 * as an error, never as "0 unread". Outside click and Escape close the panel.
 */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, error, refetch } = useNotifications({
    limit: BELL_PREVIEW_LIMIT,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // The count is undefined until the first successful response — a pending or
  // failed fetch must not be rendered as "0 unread".
  const unreadCount = isError ? undefined : data?.unreadCount;
  const items = data?.data ?? [];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95 relative"
        aria-label={
          unreadCount === undefined
            ? 'Notifications'
            : `Notifications, ${unreadCount} unread`
        }
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount !== undefined && unreadCount > 0 && (
          <span className="absolute top-1 end-1 min-w-4 h-4 px-1 flex items-center justify-center bg-red-500 text-[9px] font-bold leading-none text-white rounded-full ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Notifications
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              disabled={markAllRead.isPending || !unreadCount}
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <QueryState
              isLoading={isLoading}
              isError={isError}
              error={error}
              isEmpty={items.length === 0}
              emptyMessage="You're all caught up."
              loadingMessage="Loading notifications…"
              onRetry={() => refetch()}
            >
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      disabled={notification.isRead || markRead.isPending}
                      onClick={() => markRead.mutate(notification.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-start text-left transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-80 dark:hover:bg-gray-700/50"
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          notification.isRead ? 'bg-transparent' : 'bg-indigo-500',
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-gray-400">
                            {new Date(notification.createdAt).toLocaleDateString()}
                          </span>
                        </span>
                        <span className="line-clamp-2 block text-xs text-gray-500 dark:text-gray-400">
                          {notification.body || notification.message}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] text-gray-400">
                          {notification.type}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </QueryState>
          </div>
          <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              <Inbox className="w-3.5 h-3.5" /> View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export const Header = memo(HeaderComponent);
export default Header;
