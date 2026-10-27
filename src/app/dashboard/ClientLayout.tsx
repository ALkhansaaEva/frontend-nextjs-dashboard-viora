'use client';

import { ReactNode, memo } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/components/language-context';
import { useSidebarStore } from '@/store/sidebar.store';
import { cn } from '@/shared/lib/utils';
import { RouteAuthorization } from '@/shared/components/auth/RouteAuthorization';

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
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isRTL={isRTL} />
      <Header />
      
      <main 
        className={cn(
          'min-w-0 overflow-x-clip pb-3 pt-16 transition-[padding] duration-300 sm:pb-4 lg:overflow-visible',
          // Logical start is left in LTR and right in RTL. Using the same
          // padding rule for both directions keeps content clear of Sidebar;
          // the previous RTL branch padded the logical end and put pages
          // underneath the Sidebar.
          isCollapsed ? 'lg:ps-20 lg:pe-4' : 'lg:ps-64 lg:pe-4',
        )}
      >
        <div className="dashboard-content min-h-[calc(100dvh-4rem)] min-w-0 max-w-full p-3 sm:p-4 lg:p-6">
          <RouteAuthorization>{children}</RouteAuthorization>
        </div>
      </main>
    </div>
  );
}

export default memo(ClientLayoutComponent);
