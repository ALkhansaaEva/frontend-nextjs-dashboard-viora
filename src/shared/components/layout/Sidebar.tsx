'use client';

import { useEffect, useMemo, memo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  ShoppingBag,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Wallet,
  Bell,
  Trophy,
  Gift,
  FileText,
  Skull,
  Mic,
  LifeBuoy,
  Crown,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useSidebarStore } from '@/store/sidebar.store';
import { useAuthStore } from '@/store/auth.store';
import { can } from '@/lib/auth/permissions';

interface NavItem {
  href: string;
  Icon: typeof LayoutDashboard;
  label: string;
  labelAr: string;
  permission?: string;
}

interface SidebarSection {
  id: string;
  label: string;
  labelAr: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  sectionPermission?: string;
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    icon: LayoutDashboard,
    items: [
      { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard', labelAr: 'لوحة التحكم' },
    ]
  },
  {
    id: 'system',
    label: 'System',
    labelAr: 'النظام',
    icon: Settings,
    sectionPermission: 'manage_config',
    items: [
      { href: '/dashboard/roles', Icon: Shield, label: 'Roles', labelAr: 'الأدوار', permission: 'manage_roles' },
      { href: '/dashboard/permissions', Icon: Lock, label: 'Permissions', labelAr: 'الصلاحيات', permission: 'manage_permissions' },
      { href: '/dashboard/settings', Icon: Settings, label: 'Configs', labelAr: 'الإعدادات', permission: 'manage_config' },
    ]
  },
  {
    id: 'users',
    label: 'Users',
    labelAr: 'المستخدمون',
    icon: Users,
    sectionPermission: 'view_users',
    items: [
      { href: '/dashboard/users', Icon: Users, label: 'Users', labelAr: 'المستخدمون', permission: 'view_users' },
    ]
  },
  {
    id: 'moderation',
    label: 'Moderation',
    labelAr: 'الإشراف',
    icon: Skull,
    sectionPermission: 'manage_reports',
    items: [
      { href: '/dashboard/reports', Icon: FileText, label: 'Reports', labelAr: 'التقارير', permission: 'manage_reports' },
      { href: '/dashboard/moderation', Icon: Skull, label: 'Sanctions', labelAr: 'العقوبات', permission: 'global_ban' },
    ]
  },
  {
    id: 'rooms',
    label: 'Rooms',
    labelAr: 'الغرف',
    icon: Mic,
    sectionPermission: 'manage_all_rooms',
    items: [
      { href: '/dashboard/rooms', Icon: Mic, label: 'Rooms', labelAr: 'الغرف', permission: 'manage_all_rooms' },
    ]
  },
  {
    id: 'support',
    label: 'Support',
    labelAr: 'الدعم',
    icon: LifeBuoy,
    sectionPermission: 'manage_tickets',
    items: [
      { href: '/dashboard/support', Icon: LifeBuoy, label: 'Tickets', labelAr: 'التذاكر', permission: 'manage_tickets' },
    ]
  },
  {
    id: 'store',
    label: 'Store',
    labelAr: 'المتجر',
    icon: ShoppingBag,
    sectionPermission: 'view_transactions',
    items: [
      { href: '/dashboard/store', Icon: ShoppingBag, label: 'Store', labelAr: 'المتجر', permission: 'view_transactions' },
    ]
  },
  {
    id: 'gifts',
    label: 'Gifts',
    labelAr: 'الهدايا',
    icon: Gift,
    sectionPermission: 'manage_store',
    items: [
      { href: '/dashboard/gifts', Icon: Gift, label: 'Gifts Catalog', labelAr: 'الهدايا', permission: 'manage_store' },
    ]
  },
  {
    id: 'achievements',
    label: 'Achievements',
    labelAr: 'الإنجازات',
    icon: Trophy,
    sectionPermission: 'manage_games',
    items: [
      { href: '/dashboard/achievements', Icon: Trophy, label: 'Achievements', labelAr: 'الإنجازات', permission: 'manage_games' },
    ]
  },
  {
    id: 'rank',
    label: 'Ranks',
    labelAr: 'الترتيب',
    icon: Crown,
    sectionPermission: 'manage_games',
    items: [
      { href: '/dashboard/ranks', Icon: Crown, label: 'Ranks', labelAr: 'الترتيب', permission: 'manage_games' },
    ]
  },
  {
    id: 'profile',
    label: 'Profile',
    labelAr: 'الملف الشخصي',
    icon: User,
    items: [
      { href: '/dashboard/profile', Icon: User, label: 'My Profile', labelAr: 'ملفي' },
    ]
  },
  {
    id: 'wallet',
    label: 'Wallet',
    labelAr: 'المحفظة',
    icon: Wallet,
    items: [
      { href: '/dashboard/wallet', Icon: Wallet, label: 'Wallet', labelAr: 'المحفظة' },
    ]
  },
  {
    id: 'notifications',
    label: 'Notifications',
    labelAr: 'الإشعارات',
    icon: Bell,
    items: [
      { href: '/dashboard/notifications', Icon: Bell, label: 'Notifications', labelAr: 'الإشعارات' },
    ]
  },
];

function SidebarComponent({ isRTL = false }: { isRTL?: boolean }) {
  const pathname = usePathname();
  const { isCollapsed, isMobileOpen, closeMobile, toggleSidebar } = useSidebarStore();
  const { permissions: userPermissions, isAuthenticated } = useAuthStore();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop && isMobileOpen) {
        closeMobile();
      }
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, [isMobileOpen, closeMobile]);

  const hasPermission = (permission?: string) => {
    if (!permission) return true;
    if (!isAuthenticated) return false;
    return can(userPermissions, permission);
  };

  const hasSectionAccess = (sectionPermission?: string) => {
    if (!sectionPermission) return true;
    return hasPermission(sectionPermission);
  };

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';

  const showMobileOverlay = isMobileOpen;

  const visibleSections = useMemo(() => {
    return SIDEBAR_SECTIONS.filter(section => hasSectionAccess(section.sectionPermission));
  }, [userPermissions, isAuthenticated]);

  return (
    <>
      {showMobileOverlay && !isDesktop && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeMobile}
          role="button"
          tabIndex={-1}
          aria-label="Close menu"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <aside
        className={cn(
          "fixed top-0 h-screen z-50 flex flex-col",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
          "border-e border-gray-200/50 dark:border-gray-700/50",
          "transition-all duration-300 ease-in-out",
          sidebarWidth,
          isRTL ? "right-0" : "left-0",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : isRTL 
            ? "translate-x-full" 
            : "-translate-x-full"
        )}
      >
        <div className={cn(
          "h-16 flex items-center justify-between px-4 shrink-0",
          "border-b border-gray-200/50 dark:border-gray-700/50"
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Viora
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">Admin</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <span className="text-white font-bold text-lg">V</span>
            </div>
          )}
          <button onClick={closeMobile} className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto overflow-x-hidden">
          {visibleSections.map((section) => {
            const SectionIcon = section.icon;
            const sectionLabel = isRTL ? section.labelAr : section.label;
            
            return (
              <div key={section.id} className="space-y-1">
                {!isCollapsed && (
                  <div className="flex items-center gap-2 px-3 py-1">
                    <SectionIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {sectionLabel}
                    </span>
                  </div>
                )}
                {section.items.filter(item => hasPermission(item.permission)).map((item) => {
                  const IconComp = item.Icon;
                  const isPageActive = isActive(item.href);
                  const label = isRTL ? item.labelAr : item.label;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium",
                        "transition-all duration-200 ease-out",
                        isPageActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/25"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/80 dark:hover:bg-gray-800/80",
                        isCollapsed && "justify-center px-0"
                      )}
                      title={isCollapsed ? label : undefined}
                    >
                      <IconComp className={cn("w-5 h-5 flex-shrink-0", isPageActive && "text-white")} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className={cn("p-3 border-t border-gray-200/50 dark:border-gray-700/50 shrink-0", isCollapsed && "px-2")}>
          <button
            onClick={toggleSidebar}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl",
              "text-sm font-medium text-gray-500 dark:text-gray-400",
              "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isCollapsed && "px-2"
            )}
            title={isCollapsed ? (isRTL ? 'توسيع' : 'Expand') : (isRTL ? 'طي' : 'Collapse')}
          >
            {isCollapsed ? (
              isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                <span className="text-xs">{isRTL ? 'طي' : 'Collapse'}</span>
              </>
            )}
          </button>
          
          {!isCollapsed && (
            <div className="text-center mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Viora Admin v1.0.0</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export const Sidebar = memo(SidebarComponent);
export default Sidebar;