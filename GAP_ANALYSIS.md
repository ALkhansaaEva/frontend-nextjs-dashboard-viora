# Viora Admin Dashboard - GAP ANALYSIS REPORT

## Executive Summary
This report analyzes the current state of the Viora Admin Dashboard against the available 154 API endpoints and identifies gaps in functionality, CRUD operations, and UI/UX improvements needed.

---

## PHASE 1: CURRENT STATE ANALYSIS

### ✅ EXISTING FEATURES (Implemented)

#### Pages (12 pages)
1. `/dashboard` - Main dashboard
2. `/dashboard/users` - User management (list + search)
3. `/dashboard/users/[id]` - User details
4. `/dashboard/roles` - Role management
5. `/dashboard/ranks` - Rank system management
6. `/dashboard/rooms` - Room management (list)
7. `/dashboard/store` - Store management (items + bundles)
8. `/dashboard/reports` - Reports list
9. `/dashboard/support` - Support tickets list
10. `/dashboard/moderation` - Moderation actions
11. `/dashboard/profile` - User profile (NEW)
12. `/dashboard/settings` - Settings

#### Services (16 services)
- api.client.ts
- auth.service.ts
- users.service.ts
- admin.service.ts
- reports.service.ts
- support.service.ts
- moderation.service.ts
- health.service.ts
- wallet.service.ts
- store.service.ts
- rooms.service.ts
- configs.service.ts
- ranks.service.ts
- notifications.service.ts
- matches.service.ts
- user-profile.service.ts (NEW)

#### UI Components
- Card, Input, Button, Badge, Modal, Select, Loader

#### Layout Components
- Header (Glassmorphism - UPDATED)
- Sidebar (with Zustand - UPDATED)

---

## ⚠️ GAP ANALYSIS

### 1. MISSING PAGES

| Page | API Endpoints | Priority |
|------|---------------|----------|
| `/dashboard/wallet` | GET /wallet, GET /wallet/transactions | HIGH |
| `/dashboard/notifications` | GET /notifications, POST /notifications/:id/read | MEDIUM |
| `/dashboard/matches` | GET /matches/history, GET /matches/:matchId/chat | MEDIUM |
| `/dashboard/social` | GET /social/friends, GET /social/messages/:friendId | LOW |
| `/dashboard/meta-game` | GET /meta-game/tasks, GET /meta-game/ranking/* | LOW |
| `/dashboard/rooms/[id]` | GET /rooms/:roomId, GET /rooms/:roomId/members | HIGH |
| `/dashboard/roles/[code]` | GET /admin/roles/:code/permissions | HIGH |
| `/dashboard/store/items/create` | POST /store/items | HIGH |
| `/dashboard/reports/[id]` | GET /reports/:id, POST /reports/:id/action | HIGH |
| `/dashboard/support/[id]` | GET /support/tickets/:id, POST /support/tickets/:id/reply | HIGH |

### 2. INCOMPLETE CRUD OPERATIONS

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| **Users** | ❌ | ✅ | ❌ (profile) | ❌ |
| **Rooms** | ✅ | Partial | Partial | ✅ (close) |
| **Reports** | ❌ | Partial | ✅ (status) | ❌ |
| **Support** | ❌ | Partial | ✅ (status) | ❌ |
| **Store Items** | ✅ | ✅ | ❌ | ❌ |
| **Roles** | ✅ | ✅ | ❌ | ❌ |
| **Ranks** | ✅ | ✅ | ❌ | ❌ |
| **Wallet** | ❌ | ✅ | ❌ | ❌ |

### 3. MISSING REACT QUERY HOOKS

- useWallet, useWalletTransactions
- useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead
- useStoreItems, useCreateStoreItem, useUpdateStoreItem, useDeleteStoreItem
- useStoreBundles, usePurchaseBundle
- useInventory, useEquipItem, useUnequipItem
- useLoadout
- useMatches, useMatchHistory, useMatchChat
- useDailyLogin, useClaimDailyLogin
- useTasks, useClaimTaskReward
- useLeaderboard, useUserRank
- useFriends, useFriendRequests, useBlockUser, useMuteUser
- useConfigs
- useRoles, useCreateRole, useUpdateRole, useDeleteRole
- usePermissions, useAssignPermission, useRevokePermission

### 4. MISSING UI COMPONENTS

| Component | Purpose | Priority |
|-----------|---------|----------|
| DataTable | Reusable table with pagination | ✅ DONE |
| ConfirmDialog | Delete confirmations | ✅ DONE |
| StatCard | Dashboard stats display | MEDIUM |
| EmptyState | No data placeholder | MEDIUM |
| Tabs | Tabbed content | MEDIUM |
| DropdownMenu | Desktop actions (NOT mobile) | HIGH |
| Toast | Notifications | HIGH |

### 5. UI/UX ISSUES

- ❌ No loading skeletons for some pages
- ❌ No empty states
- ❌ No error boundaries per page
- ❌ Mobile responsiveness needs testing
- ❌ No touch-friendly interactions on mobile

### 6. SECURITY ISSUES

- ❌ No route protection based on roles
- ❌ No permission-based UI hiding
- ❌ No API-level permission checks

### 7. PERFORMANCE ISSUES

- ❌ No lazy loading for heavy components
- ❌ No code splitting per route
- ❌ No request deduplication

---

## PHASE 2: RECOMMENDED IMPLEMENTATION

### Priority 1 (Critical)
1. Complete Users CRUD - View details, assign/revoke roles, adjust balance
2. Complete Rooms CRUD - View details, manage members (ban/mute/kick)
3. Complete Reports CRUD - View details, take action, assign
4. Complete Support CRUD - View details, reply, assign

### Priority 2 (High)
5. Add Wallet page - View balance, transactions
6. Add Notifications page - View, mark read
7. Add Store Item CRUD - Create, edit, delete items
8. Add Roles CRUD - Create, edit, delete roles

### Priority 3 (Medium)
9. Add Matches page - View history, chat
10. Add Social page - Friends, messages
11. Add Meta-Game page - Tasks, leaderboard

### Priority 4 (Low)
12. Add RBAC - Route protection, UI hiding
13. Add lazy loading
14. Add error boundaries

---

## SUGGESTED FOLDER STRUCTURE

```
src/
├── app/
│   └── dashboard/
│       ├── page.tsx (Dashboard)
│       ├── layout.tsx
│       ├── profile/
│       ├── users/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (details)
│       ├── rooms/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (details)
│       ├── reports/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (details)
│       ├── support/
│       │   ├── page.tsx (list)
│       │   └── [id]/page.tsx (details)
│       ├── store/
│       ├── wallet/
│       ├── notifications/
│       ├── matches/
│       ├── social/
│       ├── meta-game/
│       └── settings/
├── components/
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   └── theme-provider.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Badge.tsx
│       ├── DataTable.tsx (NEW)
│       └── ConfirmDialog.tsx (NEW)
├── hooks/
│   ├── useApi.ts
│   ├── useUsers.ts (NEW)
│   ├── useRooms.ts (NEW)
│   ├── useReports.ts (NEW)
│   ├── useTickets.ts (NEW)
│   └── index.ts (NEW)
├── services/
│   ├── api.client.ts
│   ├── auth.service.ts
│   ├── user-profile.service.ts
│   ├── users.service.ts
│   ├── rooms.service.ts
│   ├── reports.service.ts
│   ├── support.service.ts
│   ├── store.service.ts
│   └── ... (existing)
├── store/
│   ├── auth.store.ts
│   ├── ui.store.ts
│   └── sidebar.store.ts
└── types/
    └── api.types.ts
```

---

## SUMMARY

| Category | Status |
|----------|--------|
| Pages Created | 12/17 (70%) |
| Services Created | 16/16 (100%) |
| CRUD Operations | 45% Complete |
| React Query Hooks | 20% Complete |
| UI Components | 70% Complete |
| RBAC Implementation | 0% Complete |

**Action Items:**
1. Complete missing CRUD operations (Priority 1)
2. Create React Query hooks for all services (Priority 2)
3. Add missing pages (Priority 2)
4. Implement RBAC (Priority 3)
5. Add performance optimizations (Priority 4)