'use client';

import { ReactNode, useEffect, memo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/components/language-context';
import { useSidebarStore } from '@/store/sidebar.store';
import { cn } from '@/shared/lib/utils';

const Sidebar = dynamic(
  () => import('@/shared/components/layout/Sidebar').then(m => ({ default: m.Sidebar })),
  { ssr: false, loading: () => <div className="w-64 shrink-0" /> }
);

const Header = dynamic(
  () => import('@/shared/components/layout/Header').then(m => ({ default: m.Header })),
  { ssr: false, loading: () => <div className="h-16 bg-gray-100 dark:bg-gray-800" /> }
);

function ClientLayoutComponent({ children }: { children: ReactNode }) {
  const { isRTL } = useLanguage();
  const { isCollapsed, isMobileOpen, closeMobile } = useSidebarStore();
  
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted]);

  const handleResize = useCallback(() => {
    const desktop = window.innerWidth >= 1024;
    setIsDesktop(desktop);
    if (desktop && isMobileOpen) {
      closeMobile();
    }
  }, [isMobileOpen, closeMobile]);

  useEffect(() => {
    if (!mounted) return;
    
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const sidebarWidth = isCollapsed ? '5rem' : '16rem';
  
  const mainStyle = isDesktop 
    ? { 
        [isRTL ? 'paddingRight' : 'paddingLeft']: sidebarWidth,
        [isRTL ? 'paddingLeft' : 'paddingRight']: '1rem',
      }
    : { 
        paddingLeft: '1rem',
        paddingRight: '1rem',
      };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isRTL={isRTL} />
      <Header />
      
      {isMobileOpen && !isDesktop && (
        <div 
          className="fixed inset-0 z-40"
          onClick={closeMobile}
          role="button"
          tabIndex={-1}
          aria-label="Close menu"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}
      
      <main 
        className={cn(
          "pt-16 pb-4 transition-all duration-300",
          isDesktop ? "lg:overflow-auto" : "overflow-x-hidden"
        )}
        style={mainStyle}
      >
        <div className="p-4 sm:p-6 min-h-[calc(100vh-4rem)]">
          {children}
        </div>
      </main>
    </div>
  );
}

export default memo(ClientLayoutComponent);