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
  Landmark, Gamepad2, Sparkles, Workflow, UserCog, CalendarClock, ShieldAlert, Activity, Tag, Archive, Medal,
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
  { id: 'overview', title: 'Overview', titleAr: 'نظرة عامة', icon: LayoutDashboard, order: 0 },
  { id: 'access', title: 'Access & System', titleAr: 'الوصول والنظام', icon: Shield, order: 1 },
  { id: 'community', title: 'Users & Social', titleAr: 'المستخدمون والتواصل', icon: Users, order: 2 },
  { id: 'rooms', title: 'Rooms & Matches', titleAr: 'الغرف والمباريات', icon: Mic, order: 3 },
  { id: 'safety', title: 'Safety & Support', titleAr: 'الأمان والدعم', icon: ShieldAlert, order: 4 },
  { id: 'progression', title: 'Progression & Ranks', titleAr: 'التقدم والرتب', icon: Trophy, order: 5 },
  { id: 'gameplay', title: 'Rules & Campaigns', titleAr: 'القواعد والحملات', icon: Workflow, order: 6 },
  { id: 'commerce', title: 'Commerce', titleAr: 'التجارة', icon: ShoppingBag, order: 7 },
  { id: 'communication', title: 'Communication', titleAr: 'الإشعارات', icon: Bell, order: 8 },
  { id: 'agents', title: 'Agents & Distribution', titleAr: 'الوكلاء والتوزيع', icon: UserCog, order: 9 },
  { id: 'finance', title: 'Finance', titleAr: 'المالية', icon: Landmark, order: 10 },
  { id: 'account', title: 'Account', titleAr: 'الحساب', icon: User, order: 11 },
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
    section: 'overview', icon: LayoutDashboard, requiredPermissions: [], showInNav: true, navOrder: 0,
  },

  // ── System / RBAC ──────────────────────────────────────────────
  {
    id: 'roles', path: '/dashboard/roles', title: 'Roles', titleAr: 'الأدوار',
    section: 'access', icon: Shield,
    // GET/POST/PUT/DELETE /admin/roles all require admin.read or admin.write per registry §1.
    requiredPermissions: ['admin.write', 'admin.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'role-detail', path: '/dashboard/roles/:code', title: 'Role Detail', titleAr: 'تفاصيل الدور',
    section: 'access', icon: Shield, requiredPermissions: ['admin.write', 'admin.read'], showInNav: false,
  },
  {
    id: 'permissions', path: '/dashboard/permissions', title: 'Permissions', titleAr: 'الصلاحيات',
    section: 'access', icon: Lock,
    requiredPermissions: ['admin.write', 'admin.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'settings', path: '/dashboard/settings', title: 'Configs', titleAr: 'الإعدادات',
    section: 'access', icon: Settings,
    // GET /configs and GET /configs/flags require authentication but no explicit
    // permission. Mutation controls are gated inside the page on configs.write.
    requiredPermissions: [], showInNav: true, navOrder: 2,
  },
  {
    id: 'system-health', path: '/dashboard/system-health', title: 'System Health', titleAr: 'صحة النظام',
    section: 'access', icon: Activity,
    // health/ready + health/system (GET: admin.read) — modules/common/controllers/
    // health.controller.ts. health/reset-circuits (POST: admin.write) is gated
    // inside the page behind an explicit confirmation modal.
    requiredPermissions: ['admin.read'], showInNav: true, navOrder: 3,
  },

  // ── Users ───────────────────────────────────────────────────────
  {
    id: 'users', path: '/dashboard/users', title: 'Users', titleAr: 'المستخدمون',
    section: 'community', icon: Users,
    // GET /admin/users (list) requires users.write per registry §1; users.read only covers single-user reads.
    requiredPermissions: ['users.write', 'users.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'user-detail', path: '/dashboard/users/:id', title: 'User Detail', titleAr: 'تفاصيل المستخدم',
    section: 'community', icon: Users, requiredPermissions: ['users.read'], showInNav: false,
  },
  {
    id: 'user-permissions', path: '/dashboard/users/:id/permissions', title: 'User Permissions', titleAr: 'صلاحيات المستخدم',
    section: 'community', icon: Lock, requiredPermissions: ['admin.write'], showInNav: false,
  },

  // ── Moderation ─────────────────────────────────────────────────
  {
    id: 'reports', path: '/dashboard/reports', title: 'Reports', titleAr: 'التقارير',
    section: 'safety', icon: FileText, requiredPermissions: ['reports.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'moderation', path: '/dashboard/moderation', title: 'Sanctions', titleAr: 'العقوبات',
    section: 'safety', icon: Skull, requiredPermissions: ['moderation.read'], showInNav: true, navOrder: 1,
  },

  // ── Rooms / Matches ────────────────────────────────────────────
  {
    id: 'rooms', path: '/dashboard/rooms', title: 'Rooms', titleAr: 'الغرف',
    section: 'rooms', icon: Mic, requiredPermissions: ['rooms.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'matches', path: '/dashboard/matches', title: 'Match Lookup', titleAr: 'بحث المباريات',
    section: 'rooms', icon: Gamepad2,
    // Backend admin surface for matches is minimal (one support.execute lookup route) — see
    // BACKEND_CAPABILITY_REGISTRY.md §9. No permission gate beyond authentication until a
    // real admin matches API exists; do not claim admin capabilities the backend can't do.
    requiredPermissions: [], showInNav: true, navOrder: 1,
  },

  // ── Support ────────────────────────────────────────────────────
  {
    id: 'support', path: '/dashboard/support', title: 'Tickets', titleAr: 'التذاكر',
    section: 'safety', icon: LifeBuoy, requiredPermissions: ['support.execute'], showInNav: true, navOrder: 2,
  },
  {
    id: 'support-ticket', path: '/dashboard/support/:id', title: 'Ticket', titleAr: 'تذكرة',
    section: 'safety', icon: LifeBuoy, requiredPermissions: ['support.execute'], showInNav: false, navOrder: 3,
  },

  // ── Store ──────────────────────────────────────────────────────
  {
    id: 'store', path: '/dashboard/store', title: 'Store', titleAr: 'المتجر',
    section: 'commerce', icon: ShoppingBag, requiredPermissions: ['store.read'], showInNav: true, navOrder: 0,
  },

  // ── Store Offers (§37) ─────────────────────────────────────────
  {
    id: 'store-offers', path: '/dashboard/store/offers', title: 'Store Offers', titleAr: 'عروض المتجر',
    section: 'commerce', icon: Tag,
    // admin/store/offers (GET: store.catalog_read; POST/PATCH: store.catalog_manage)
    // — store-offer.controller.ts. The page gates mutation controls itself.
    requiredPermissions: ['store.catalog_read'], showInNav: true, navOrder: 1,
  },

  // ── Gifts ──────────────────────────────────────────────────────
  {
    id: 'gifts', path: '/dashboard/gifts', title: 'Gifts Catalog', titleAr: 'الهدايا',
    section: 'commerce', icon: Gift, requiredPermissions: ['store.catalog_read'], showInNav: true, navOrder: 0,
  },

  // ── Achievements / Meta-Game ───────────────────────────────────
  {
    id: 'achievements', path: '/dashboard/achievements', title: 'Achievements', titleAr: 'الإنجازات',
    section: 'progression', icon: Trophy,
    // achievements.read/write ARE canonical codes — they gate RuleAdminController for
    // kind=ACHIEVEMENT (see BACKEND_CAPABILITY_REGISTRY.md §5-6). This page is scheduled
    // for a full rebuild against /admin/rules in Phase 2C; the permission is already correct.
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'badges', path: '/dashboard/badges', title: 'Badges', titleAr: 'الشارات',
    section: 'progression', icon: Medal,
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'meta-tasks', path: '/dashboard/meta/tasks', title: 'Tasks', titleAr: 'المهام',
    section: 'gameplay', icon: Workflow,
    // RuleAdminController (kind=TASK) is gated on achievements.write/read — see
    // BACKEND_CAPABILITY_REGISTRY.md §5-6. There is no separate "tasks" permission.
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'meta-game', path: '/dashboard/meta-game', title: 'Meta-Game', titleAr: 'الألعاب الوصفية',
    section: 'gameplay', icon: Sparkles,
    // No canonical permission is minted for the meta_game gateway on the backend
    // (BACKEND_CAPABILITY_REGISTRY.md, "Canonical permission list" note). No legacy
    // equivalent existed in the previous Sidebar either — authenticated-only until
    // the backend mints one.
    requiredPermissions: [], showInNav: false, navOrder: 2,
  },

  // ── Ranks ──────────────────────────────────────────────────────
  {
    id: 'ranks', path: '/dashboard/ranks', title: 'System Rank Definitions', titleAr: 'تعريفات رتب النظام',
    section: 'progression', icon: Crown,
    // RanksController read routes are authenticated but carry no RequirePermissions;
    // mutations use PERMS.matchesWrite. The page gates every mutation control itself.
    requiredPermissions: [], showInNav: true, navOrder: 0,
  },

  // ── Gameplay / Rule Engine (Phase 2B) ─────────────────────────
  {
    id: 'gameplay-rules', path: '/dashboard/gameplay/rules', title: 'Rules', titleAr: 'القواعد',
    section: 'gameplay', icon: Workflow,
    // RuleAdminController gates GET routes (list/detail/nodes/versions) on
    // achievements.read and mutation routes on achievements.write (rule-admin.controller.ts) —
    // the route itself must accept EITHER so achievements.read gets read-only
    // access instead of being locked out of the page entirely. The RuleBuilder
    // component does its own write-permission gating for mutation controls.
    requiredPermissions: ['achievements.write', 'achievements.read'], showInNav: true, navOrder: 0,
  },
  {
    id: 'progression', path: '/dashboard/progression', title: 'Progression', titleAr: 'التقدم',
    section: 'progression', icon: Workflow,
    // admin/progression-policy (GET: admin.read) + admin/room-level-policy
    // (GET: admin.read) — modules/game/progression-policy.controller.ts,
    // modules/rooms/room-level-policy.controller.ts. Mutation controls inside
    // the page are separately gated on configs.write.
    requiredPermissions: ['admin.read'], showInNav: true, navOrder: 1,
  },
  {
    id: 'campaigns', path: '/dashboard/campaigns', title: 'Campaigns', titleAr: 'الحملات',
    section: 'gameplay', icon: CalendarClock,
    // admin/campaigns (GET: admin.read; POST create: achievements.write;
    // POST :id/schedule + PATCH :id/status: configs.write) —
    // modules/gameplay-events/campaign-admin.controller.ts. Mutation controls
    // inside the page are separately gated on achievements.write/configs.write.
    requiredPermissions: ['admin.read'], showInNav: true, navOrder: 2,
  },
  {
    id: 'archive-center', path: '/dashboard/archive', title: 'Archive', titleAr: 'الأرشيف',
    section: 'gameplay', icon: Archive,
    // Read projection over /admin/rules?state=ARCHIVED (achievements.read) and
    // /admin/store/offers (store.catalog_read). Page hides tabs the admin cannot read.
    requiredPermissions: ['achievements.read'], showInNav: true, navOrder: 9,
  },
  {
    id: 'progression-tracks', path: '/dashboard/progression-tracks', title: 'Progression Tracks', titleAr: 'مسارات التقدم',
    section: 'progression', icon: Workflow,
    // GET/list/detail use admin.read; create/update/publish/disable use configs.write
    // (ProgressionTrackAdminController). The page independently gates mutation controls.
    requiredPermissions: ['configs.write', 'admin.read'], showInNav: true, navOrder: 3,
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
    // The listing is GET /admin/users, gated on users.write; the adjust action is
    // POST /admin/users/:id/balance, gated on wallet.write.
    id: 'wallets', path: '/dashboard/wallets', title: 'Wallets', titleAr: 'المحافظ',
    section: 'finance', icon: Wallet, requiredPermissions: ['users.write'], showInNav: true, navOrder: 0,
  },
  {
    // Hidden from nav: no genuine admin-wide purchases list endpoint exists
    // on the backend (only GET /admin/users/:id/purchases, per-user). The
    // page currently fans out GET .../purchases across a page of users to
    // fake an aggregate list — a real N+1 anti-pattern, not a production
    // Admin payments system. BACKEND GAP: needs a real list endpoint before
    // this can be a first-class nav entry again. Permission requirement is
    // kept so direct URL access still enforces the same gate as before.
    id: 'payments', path: '/dashboard/payments', title: 'Payments', titleAr: 'المدفوعات',
    section: 'finance', icon: CreditCard, requiredPermissions: ['wallet.read'], showInNav: false, navOrder: 1,
  },
  {
    id: 'iap-products', path: '/dashboard/payments/iap', title: 'IAP Products', titleAr: 'منتجات الشراء داخل التطبيق',
    section: 'finance', icon: CreditCard,
    // admin/iap/products (GET: iap.read; POST/PATCH: iap.execute) — iap-admin.controller.ts.
    requiredPermissions: ['iap.read'], showInNav: true, navOrder: 2,
  },
  {
    id: 'my-wallet', path: '/dashboard/wallet', title: 'My Wallet', titleAr: 'محفظتي',
    section: 'account', icon: Wallet, requiredPermissions: [], showInNav: true, navOrder: 2,
  },
  {
    id: 'reconciliation', path: '/dashboard/reconciliation', title: 'Reconciliation', titleAr: 'التسوية المالية',
    section: 'finance', icon: ShieldAlert,
    // admin/financial-reconciliation/findings (GET: reports.read) — modules/reconciliation/
    // reconciliation.controller.ts. The manual run trigger (POST .../run) requires BOTH
    // reports.execute AND financial.execute and is gated inside the page itself.
    requiredPermissions: ['reports.read'], showInNav: true, navOrder: 3,
  },

  // ── Notifications (self-service inbox — no admin broadcast API exists) ──
  {
    id: 'notifications', path: '/dashboard/notifications', title: 'Notifications', titleAr: 'الإشعارات',
    section: 'communication', icon: Bell, requiredPermissions: [], showInNav: true, navOrder: 0,
  },

  // ── Profile ────────────────────────────────────────────────────
  {
    id: 'profile', path: '/dashboard/profile', title: 'My Profile', titleAr: 'ملفي',
    section: 'account', icon: User, requiredPermissions: [], showInNav: true, navOrder: 0,
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

/**
 * Resolves exactly one highlighted Sidebar route for a live pathname.
 *
 * Detail routes are not rendered in the nav, so they fall back to the most
 * specific visible parent. Segment-boundary matching prevents sibling routes
 * such as `/dashboard/store` and `/dashboard/storefront` from colliding.
 */
export function matchActiveNavRoute(pathname: string): AdminRouteDefinition | undefined {
  const exact = matchAdminRoute(pathname);
  if (exact?.showInNav && exact.enabled !== false) return exact;

  return ROUTES_BY_SPECIFICITY.find((route) => {
    if (!route.showInNav || route.enabled === false) return false;
    if (route.path.includes(':')) return false;
    return pathname === route.path || pathname.startsWith(`${route.path}/`);
  });
}

export function getRoutesForSection(sectionId: string): AdminRouteDefinition[] {
  return ADMIN_ROUTES
    .filter((r) => r.section === sectionId && r.showInNav && r.enabled !== false)
    .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0));
}

export function getNavSections(): AdminSectionDefinition[] {
  return [...ADMIN_SECTIONS].sort((a, b) => a.order - b.order);
}
