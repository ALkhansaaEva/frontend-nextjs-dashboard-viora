/**
 * Central Admin Route Registry — single source of truth for Dashboard navigation,
 * route-level authorization, and (where practical) breadcrumbs.
 *
 * Do NOT maintain a second independent list of dashboard routes/permissions
 * anywhere else (Sidebar, layout guards, breadcrumbs must all read this file).
 *
 * `requiredPermissions` uses the CANONICAL backend dot-notation codes from
 * `BACKEND_CAPABILITY_REGISTRY.md` wherever one is minted server-side. A few
 * gateways (`ranks`, `meta_game`) have no canonical permission wired up on the
 * backend yet — those routes keep the legacy bitmask code they always used,
 * with a comment explaining why, rather than inventing a canonical string
 * that doesn't exist server-side.
 *
 * This file grows one section at a time as each implementation phase lands a
 * page — see GAP_ANALYSIS.md for the phase plan. Do not pre-register routes
 * for pages that don't exist yet (dead nav links).
 */
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, Shield, Settings, ShoppingBag, User, Lock, Wallet,
  Bell, Trophy, Gift, FileText, Skull, Mic, LifeBuoy, Crown, CreditCard,
  Landmark, Gamepad2, MessageCircle, Sparkles, Workflow, UserCog,
} from 'lucide-react';

export type PermissionMatchMode = 'any' | 'all';

export interface AdminRouteDefinition {
  /** Stable identifier, also used as the React key in nav rendering. */
  id: string;
  /** Path template. Dynamic segments use `:param` (e.g. `/dashboard/users/:id`). */
  path: string;
  title: string;
  titleAr: string;
  section: string;
  icon: LucideIcon;
  /**
   * Canonical backend permission code(s) required to view this route.
   * Empty array = any authenticated admin user may view it (no permission gate).
   */
  requiredPermissions: string[];
  matchMode?: PermissionMatchMode;
  /** Whether this route appears as a Sidebar link. Detail/sub-routes are usually false. */
  showInNav: boolean;
  /** Sort position within its section. */
  navOrder?: number;
  /** Set false to hard-disable a route regardless of permissions (maintenance/kill-switch). */
  enabled?: boolean;
}

export interface AdminSectionDefinition {
  id: string;
  title: string;
  titleAr: string;
  icon: LucideIcon;
  order: number;
}

export const ADMIN_SECTIONS: AdminSectionDefinition[] = [
  { id: 'dashboard', title: 'Dashboard', titleAr: 'لوحة التحكم', icon: LayoutDashboard, order: 0 },
  { id: 'system', title: 'System', titleAr: 'النظام', icon: Settings, order: 1 },
  { id: 'users', title: 'Users', titleAr: 'المستخدمون', icon: Users, order: 2 },
  { id: 'moderation', title: 'Moderation', titleAr: 'الإشراف', icon: Skull, order: 3 },
  { id: 'rooms', title: 'Rooms & Matches', titleAr: 'الغرف والمباريات', icon: Mic, order: 4 },
  { id: 'support', title: 'Support', titleAr: 'الدعم', icon: LifeBuoy, order: 5 },
  { id: 'store', title: 'Store', titleAr: 'المتجر', icon: ShoppingBag, order: 6 },
  { id: 'gifts', title: 'Gifts', titleAr: 'الهدايا', icon: Gift, order: 7 },
  { id: 'meta', title: 'Achievements & Meta-Game', titleAr: 'الإنجازات', icon: Trophy, order: 8 },
  { id: 'rank', title: 'Ranks', titleAr: 'الترتيب', icon: Crown, order: 9 },
  { id: 'gameplay', title: 'Gameplay', titleAr: 'نظام اللعب', icon: Workflow, order: 10 },
  { id: 'agents', title: 'Agents & Distribution', titleAr: 'الوكلاء والتوزيع', icon: UserCog, order: 11 },
  { id: 'finance', title: 'Finance', titleAr: 'المالية', icon: Landmark, order: 12 },
  { id: 'social', title: 'Social', titleAr: 'اجتماعي', icon: MessageCircle, order: 13 },
  { id: 'notifications', title: 'Notifications', titleAr: 'الإشعارات', icon: Bell, order: 14 },
  { id: 'profile', title: 'Profile', titleAr: 'الملف الشخصي', icon: User, order: 15 },
];

/**
 * NOTE on permission choices below: where a page has no clear single gating
 * permission (e.g. it aggregates several endpoints with different codes),
 * the BROADEST canonical permission actually required by the primary list
 * endpoint that page depends on is used, matched against
 * BACKEND_CAPABILITY_REGISTRY.md — not guessed.
 */
export const ADMIN_ROUTES: AdminRouteDefinition[] = [
  {
    id: 'dashboard-home', path: '/dashboard', title: 'Dashboard', titleAr: 'لوحة التحكم',
    section: 'dashboard', icon: LayoutDashboard, requiredPermissions: [], showInNav: true, navOrder: 0,
  },

  // ── System / RBAC ──────────────────────────────────────────────
  {
    id: 'roles', path: '/dashboard/roles', title: 'Roles', titleAr: 'الأدوار',
    section: 'system', icon: Shield,
    // GET/POST/PUT/DELETE /admin/roles all require admin.read or admin.write per registry §1.
    requiredPermissions: ['admin.write', 'admin.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'role-detail', path: '/dashboard/roles/:code', title: 'Role Detail', titleAr: 'تفاصيل الدور',
    section: 'system', icon: Shield, requiredPermissions: ['admin.write', 'admin.read'], showInNav: false,
  },
  {
    id: 'permissions', path: '/dashboard/permissions', title: 'Permissions', titleAr: 'الصلاحيات',
    section: 'system', icon: Lock,
    requiredPermissions: ['admin.write', 'admin.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'settings', path: '/dashboard/settings', title: 'Configs', titleAr: 'الإعدادات',
    section: 'system', icon: Settings,
    // GET /configs is public; POST /configs requires configs.write — gate nav on the write capability
    // since this page's purpose is editing, not just viewing.
    requiredPermissions: ['configs.write'], showInNav: true, navOrder: 2,
  },

  // ── Users ───────────────────────────────────────────────────────
  {
    id: 'users', path: '/dashboard/users', title: 'Users', titleAr: 'المستخدمون',
    section: 'users', icon: Users,
    // GET /admin/users (list) requires users.write per registry §1; users.read only covers single-user reads.
    requiredPermissions: ['users.write', 'users.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'user-detail', path: '/dashboard/users/:id', title: 'User Detail', titleAr: 'تفاصيل المستخدم',
    section: 'users', icon: Users, requiredPermissions: ['users.read'], showInNav: false,
  },
  {
    id: 'user-permissions', path: '/dashboard/users/:id/permissions', title: 'User Permissions', titleAr: 'صلاحيات المستخدم',
    section: 'users', icon: Lock, requiredPermissions: ['admin.write'], showInNav: false,
  },

  // ── Moderation ─────────────────────────────────────────────────
  {
    id: 'reports', path: '/dashboard/reports', title: 'Reports', titleAr: 'التقارير',
    section: 'moderation', icon: FileText, requiredPermissions: ['reports.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'moderation', path: '/dashboard/moderation', title: 'Sanctions', titleAr: 'العقوبات',
    section: 'moderation', icon: Skull, requiredPermissions: ['moderation.read'], showInNav: true, navOrder: 1,
  },

  // ── Rooms / Matches ────────────────────────────────────────────
  {
    id: 'rooms', path: '/dashboard/rooms', title: 'Rooms', titleAr: 'الغرف',
    section: 'rooms', icon: Mic, requiredPermissions: ['rooms.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'matches', path: '/dashboard/matches', title: 'Matches', titleAr: 'المباريات',
    section: 'rooms', icon: Gamepad2,
    // Backend admin surface for matches is minimal (one support.execute lookup route) — see
    // BACKEND_CAPABILITY_REGISTRY.md §9. No permission gate beyond authentication until a
    // real admin matches API exists; do not claim admin capabilities the backend can't do.
    requiredPermissions: [], showInNav: true, navOrder: 1,
  },

  // ── Support ────────────────────────────────────────────────────
  {
    id: 'support', path: '/dashboard/support', title: 'Tickets', titleAr: 'التذاكر',
    section: 'support', icon: LifeBuoy, requiredPermissions: ['support.execute'], showInNav: true, navOrder: 0,
  },

  // ── Store ──────────────────────────────────────────────────────
  {
    id: 'store', path: '/dashboard/store', title: 'Store', titleAr: 'المتجر',
    section: 'store', icon: ShoppingBag, requiredPermissions: ['store.read'], showInNav: true, navOrder: 0,
  },

  // ── Gifts ──────────────────────────────────────────────────────
  {
    id: 'gifts', path: '/dashboard/gifts', title: 'Gifts Catalog', titleAr: 'الهدايا',
    section: 'gifts', icon: Gift, requiredPermissions: ['store.catalog_read'], showInNav: true, navOrder: 0,
  },

  // ── Achievements / Meta-Game ───────────────────────────────────
  {
    id: 'achievements', path: '/dashboard/achievements', title: 'Achievements', titleAr: 'الإنجازات',
    section: 'meta', icon: Trophy,
    // achievements.read/write ARE canonical codes — they gate RuleAdminController for
    // kind=ACHIEVEMENT (see BACKEND_CAPABILITY_REGISTRY.md §5-6). This page is scheduled
    // for a full rebuild against /admin/rules in Phase 2C; the permission is already correct.
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'meta-tasks', path: '/dashboard/meta/tasks', title: 'Tasks', titleAr: 'المهام',
    section: 'meta', icon: Workflow,
    // RuleAdminController (kind=TASK) is gated on achievements.write/read — see
    // BACKEND_CAPABILITY_REGISTRY.md §5-6. There is no separate "tasks" permission.
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'meta-game', path: '/dashboard/meta-game', title: 'Meta-Game', titleAr: 'الألعاب الوصفية',
    section: 'meta', icon: Sparkles,
    // No canonical permission is minted for the meta_game gateway on the backend
    // (BACKEND_CAPABILITY_REGISTRY.md, "Canonical permission list" note). No legacy
    // equivalent existed in the previous Sidebar either — authenticated-only until
    // the backend mints one.
    requiredPermissions: [], showInNav: true, navOrder: 2,
  },

  // ── Ranks ──────────────────────────────────────────────────────
  {
    id: 'ranks', path: '/dashboard/ranks', title: 'Ranks', titleAr: 'الترتيب',
    section: 'rank', icon: Crown,
    // No canonical permission exists for the `ranks` gateway (confirmed in the backend
    // audit). Kept on the legacy `manage_games` code intentionally — there is no
    // canonical replacement to migrate to yet.
    requiredPermissions: ['manage_games'], showInNav: true, navOrder: 0,
  },

  // ── Gameplay / Rule Engine (Phase 2B) ─────────────────────────
  {
    id: 'gameplay-rules', path: '/dashboard/gameplay/rules', title: 'Rules', titleAr: 'القواعد',
    section: 'gameplay', icon: Workflow,
    // achievements.write gates RuleAdminController (see BACKEND_CAPABILITY_REGISTRY.md §5) —
    // this really is the correct canonical code even though the route lives under /gameplay,
    // because the backend has no separate "rules" gateway/permission.
    requiredPermissions: ['achievements.write'], showInNav: true, navOrder: 0,
  },

  // ── Agents / Distribution (Phase 2D) ──────────────────────────
  {
    id: 'agents', path: '/dashboard/agents', title: 'Agents', titleAr: 'الوكلاء',
    section: 'agents', icon: UserCog, requiredPermissions: ['agents.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'distributors', path: '/dashboard/distributors', title: 'Distributors', titleAr: 'الموزعون',
    section: 'agents', icon: Landmark, requiredPermissions: ['agents.write', 'agents.read'], showInNav: true, navOrder: 1,
  },

  // ── Finance (existing pages; full /dashboard/finance overview lands in Phase 2E) ──
  {
    id: 'wallets', path: '/dashboard/wallets', title: 'Wallets', titleAr: 'المحافظ',
    section: 'finance', icon: Wallet, requiredPermissions: ['wallet.write', 'wallet.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'payments', path: '/dashboard/payments', title: 'Payments', titleAr: 'المدفوعات',
    section: 'finance', icon: CreditCard, requiredPermissions: ['wallet.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'my-wallet', path: '/dashboard/wallet', title: 'My Wallet', titleAr: 'محفظتي',
    section: 'finance', icon: Wallet, requiredPermissions: [], showInNav: true, navOrder: 2,
  },

  // ── Social ─────────────────────────────────────────────────────
  {
    id: 'social', path: '/dashboard/social', title: 'Social', titleAr: 'اجتماعي',
    section: 'social', icon: MessageCircle, requiredPermissions: ['social.read'], showInNav: true, navOrder: 0,
  },

  // ── Notifications (self-service inbox — no admin broadcast API exists) ──
  {
    id: 'notifications', path: '/dashboard/notifications', title: 'Notifications', titleAr: 'الإشعارات',
    section: 'notifications', icon: Bell, requiredPermissions: [], showInNav: true, navOrder: 0,
  },

  // ── Profile ────────────────────────────────────────────────────
  {
    id: 'profile', path: '/dashboard/profile', title: 'My Profile', titleAr: 'ملفي',
    section: 'profile', icon: User, requiredPermissions: [], showInNav: true, navOrder: 0,
  },
];

function pathToRegex(template: string): RegExp {
  const escaped = template
    .split('/')
    .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/');
  return new RegExp(`^${escaped}/?$`);
}

/** Routes sorted longest-path-first so the most specific match wins. */
const ROUTES_BY_SPECIFICITY = [...ADMIN_ROUTES].sort((a, b) => b.path.length - a.path.length);

/** Finds the registry entry matching a live pathname (e.g. `/dashboard/users/abc-123`). */
export function matchAdminRoute(pathname: string): AdminRouteDefinition | undefined {
  return ROUTES_BY_SPECIFICITY.find((route) => pathToRegex(route.path).test(pathname));
}

export function getRoutesForSection(sectionId: string): AdminRouteDefinition[] {
  return ADMIN_ROUTES
    .filter((r) => r.section === sectionId && r.showInNav && r.enabled !== false)
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0));
}

export function getNavSections(): AdminSectionDefinition[] {
  return [...ADMIN_SECTIONS].sort((a, b) => a.order - b.order);
}
