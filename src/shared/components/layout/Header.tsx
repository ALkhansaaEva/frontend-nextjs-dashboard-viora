'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import Link from 'next/link';
import { 
  Moon, 
  Sun, 
  Menu, 
  Bell,
  LogOut,
  Settings,
  Globe
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { useLanguage } from '@/components/language-context';
import { useVioraTheme } from '@/components/providers/theme-provider';
import { useSidebarStore } from '@/store/sidebar.store';
import { cn } from '@/shared/lib/utils';

interface HeaderProps {
  className?: string;
}

function HeaderComponent({ className }: HeaderProps) {
  const { isDark, toggleTheme } = useVioraTheme();
  const { user, logout } = useAuthStore();
  const { locale, setLocale } = useLanguage();
  const { openMobile } = useSidebarStore();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
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
          <button 
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95 relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-200 active:scale-95"
            aria-label="Toggle theme"
          >
            {mounted && isDark ? (
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

export const Header = memo(HeaderComponent);
export default Header;