# Viora Admin Dashboard — Gap Analysis (v2, reconciled against live backend source)

> Supersedes the previous version of this file, which predated the current frontend page set and did not account for Agents/Distribution/Rules/Progression/Reward-Bundle-V2 at all. Backend facts below are sourced from [`BACKEND_CAPABILITY_REGISTRY.md`](BACKEND_CAPABILITY_REGISTRY.md), built from a live read of the backend source, not from `backend-full-api-contract.md`/`API_ENDPOINTS.md` (both stale — zero mentions of Agents, Distribution, Commissions, Rules, Reward Bundle V2, Progression, Campaigns, Reconciliation).
>
> Status legend: **CONNECTED** (wired to a real, correct backend endpoint) · **PARTIAL** (some operations wired, others missing/wrong) · **BROKEN** (calls an endpoint that does not exist on the backend) · **LEGACY** (works but targets a deprecated schema/endpoint) · **MISSING** (backend exists, no frontend at all) · **UNSUPPORTED_BY_BACKEND** (frontend concept has no backend counterpart, don't build it as first-class).

---

## Phase 2 implementation status (updated 2026-08-16)

**Done and build-verified (typecheck + lint + `next build` all pass, zero new issues — confirmed via git-stash diff against baseline for every pre-existing lint finding):**
- **Phase 2A** — `src/lib/admin/admin-routes.ts` central registry now drives Sidebar + route-level authorization; `RouteAuthorization.tsx` wired into `dashboard/layout.tsx` (previously `PermissionGuard`/`AuthGuard` were dead code); both hardcoded `canManage = true` removed (achievements/gifts now check real `achievements.write`/`store.catalog_manage`); `ActionButtons` default flipped to `false`; dashboard KPI fabrication removed (`activeSanctions`, `dailyActiveUsers`, `avgResponseTime` now `null` → renders `N/A`, no more hardcoded `85` fallback or fake `0`); added real DB/Redis/Nakama/API status badges from `/health/ready`; `src/lib/api/routes.ts` expanded with Rules/Nodes/RewardBundles/Campaigns/Agents/Distribution/Reconciliation/Progression endpoints; added `pnpm typecheck` script; added a central `Toaster`/`useToast()` (previously no toast system existed at all — some pages used `alert()`).
- **Phase 2B** — Full Rule Engine admin at [`/dashboard/gameplay/rules`](src/app/dashboard/gameplay/rules/page.tsx): backend-driven Node Registry browser, typed graph composer (Trigger→Conditions(AND)→Counter→Window→Actions), shared `RewardBundleV2Editor` (XP/GAME_CURRENCY/ITEM/BADGE/NOTIFICATION/INTERNAL_EVENT, with real Store-catalog item/badge search instead of raw UUID entry), full DRAFT→VALIDATED→PUBLISHED→DISABLED/ROLLED_BACK lifecycle wired to real endpoints. **New confirmed backend gap**: `RuleAdminController` has no `GET` list or detail endpoint at all — only create/validate/preview/publish/disable/rollback — verified by direct source read, not assumed. The UI is honest about this (visible banner) rather than fabricating a list.
- **Phase 2C** — Achievements and Tasks rebuilt as domain-specific views over the Rule Engine (`kind='ACHIEVEMENT'`/`kind='TASK'`). **Critical correction**: the *entire* achievements domain — not just admin CRUD — was confirmed fictional (`grep -r "@Controller('achievements'" backend/src` → zero matches anywhere). `achievements.service.ts` was rewritten to stop calling `/admin/achievements` and `/achievements*` entirely; the old `AchievementCard`/`AchievementTable` components (built for data that was never real) were deleted as dead code. **Also newly confirmed**: `meta-game.controller.ts` (direct source read) exposes only ranking/leaderboard routes — `/meta-game/tasks`, `/meta-game/task-definitions`, `/meta-game/daily-login*` referenced by `meta-game.service.ts` do not exist either. New Task admin built at [`/dashboard/meta/tasks`](src/app/dashboard/meta/tasks/page.tsx).

- **Phase 2D** — [`/dashboard/agents`](src/app/dashboard/agents/page.tsx): real list (`GET /admin/agents` genuinely exists, unlike Rules), create, status transitions, fund/sale/redemption/reversal (each with a fresh `Idempotency-Key`, explicit confirmation dialog showing amount+action+target before executing), commission policy draft+publish. [`/dashboard/distributors`](src/app/dashboard/distributors/page.tsx): create, status, agent assignment, funding, exchange-rate policy draft+approve. **New confirmed backend gap**: `DistributionAdminController` has no list endpoint at all (verified by direct source read) — the page tracks distributors created in the current session and is explicit about this limitation in its UI banner, same pattern as Rules. Not yet built: dedicated Agent Topup review queue UI and Agent Governance (cases/sanctions/appeals) UI — the service methods exist (`agents.service.ts`) but have no page wired to them yet.

**Not started yet**: Finance/Reconciliation (2E), Progression/Campaigns (2F), System Health page (2G), full legacy-pattern sweep + final report (2H). See BACKEND_CAPABILITY_REGISTRY.md for the exact endpoints each will use.

---

## Critical findings (read this first)

1. **Achievements Admin is BROKEN.** [`achievements.service.ts`](src/services/achievements.service.ts) calls `GET/POST /admin/achievements`, `GET/PUT/DELETE /admin/achievements/:id`, `GET /admin/catalog/achievements`. **None of these routes exist on the backend** — `modules/achievements` is empty scaffolding (confirmed: zero controller/entity/DTO files). Any create/edit/delete done through the current Achievements page silently fails or 404s. Real achievement authoring must go through `POST /admin/rules` with `kind:'ACHIEVEMENT'` (the Rule engine), using the Node Registry + Reward Bundle V2 editor — a different API shape entirely.
2. **Achievements reward shape is the legacy schema the project explicitly wants gone**: `rewards: { gold?, gems?, xp?, itemCode? }` in [`achievements.service.ts:15-20`](src/services/achievements.service.ts:15) is exactly `rewardGold/rewardGems/rewardXp/rewardItemCode` — must become `RewardBundleV2` component list.
3. **No route-level authorization exists anywhere.** `PermissionGuard`/`AuthGuard`/`RoleRouteGuard` ([`PermissionGuard.tsx`](src/shared/components/auth/PermissionGuard.tsx), [`AuthGuard.tsx`](src/shared/components/auth/AuthGuard.tsx)) are fully implemented but **imported nowhere in the app** — confirmed by grep. No `middleware.ts` either. A logged-in user with insufficient permissions can open any `/dashboard/*` route today; only the Sidebar hides the link, and each page does its own inconsistent ad-hoc `isAuthenticated` check (not a permission check).
4. **Two hardcoded `canManage = true`** in [`achievements/page.tsx:85`](src/app/dashboard/achievements/page.tsx:85) and [`gifts/page.tsx:87`](src/app/dashboard/gifts/page.tsx:87), plus [`ActionButtons.tsx`](src/shared/components/ui/ActionButtons.tsx:12) defaults `canManage=true` for any caller that omits the prop.
5. **Dashboard home fabricates two KPI values**: `activeSanctions: 0` and `dailyActiveUsers: 0` are hardcoded literals in [`health.service.ts:54,58`](src/services/health.service.ts:54) (no real endpoint backs them), and `systemHealthPct` falls back to a hardcoded `85` when metrics are unavailable ([`dashboard/page.tsx:102`](src/app/dashboard/page.tsx:102)) — all should render `N/A`.
6. **9 major backend domains have zero frontend**: Agents, Distributors, Commissions, Financial Reconciliation, Rules/Rule-Nodes/Reward-Bundle-V2 admin, Campaigns, Player/Room/Track Progression admin, System Health page, Audit (though Audit has no backend read API either — see below).
7. **Audit cannot be built yet regardless of frontend effort** — the backend's `AuditService` has working query methods (`findRecent`, `findByActor`, `findByTarget`, `findByActionType`) but **zero HTTP controller exposes them**. This is a backend gap, not a frontend one — flag for the backend team; do not fake an audit trail client-side.
8. **"Distributor" is real** — contrary to the common assumption that it might not exist, the backend has a genuine two-tier `MasterDistributorProfile → DistributorAgentAssignment → AgentProfile` hierarchy with its own `FinancialAccount.ownerType='distributor'`. Build it as first-class, not a variant of Agents.

---

## Domain-by-domain reconciliation

| Backend domain | Backend status | Frontend page(s) | Frontend service | Status | Notes |
|---|---|---|---|---|---|
| Users | Full | `/dashboard/users`, `/[id]`, `/[id]/permissions` | `admin.service.ts`, `users.service.ts` | **CONNECTED** | Endpoints match `admin.controller.ts` almost exactly incl. permission overrides, inventory, purchases, loadout |
| Roles | Full | `/dashboard/roles`, `/[code]` | `admin.service.ts` | **CONNECTED** | `deletePermission` correctly stubbed as unsupported rather than faked — good pattern to replicate elsewhere |
| Permissions | Full | `/dashboard/permissions` | `admin.service.ts` | **CONNECTED** | |
| Agents | Full | *(none)* | *(none)* | **MISSING** | Full lifecycle (create/status/fund/sales/redemptions/reverse), topup review workflow, governance/sanctions — nothing built |
| Distributors | Full | *(none)* | *(none)* | **MISSING** | Two-tier hierarchy, rate policies, cashout settlement — nothing built |
| Commissions | Full | *(none)* | *(none)* | **MISSING** | `AgentCommissionPolicy` draft/publish — nothing built |
| Financial overview | Full (ledger) | `/dashboard/payments`, `/dashboard/wallets`, `/dashboard/wallet` | `wallet.service.ts`, `admin.service.ts` | **PARTIAL** | Balance adjust via `/admin/users/:id/balance` is wired (recent commit history shows this); no dedicated `/dashboard/finance` overview, no financial-accounts list by owner type, no reconciliation UI |
| Reconciliation | Full | *(none)* | *(none)* | **MISSING** | `GET findings` / `POST run` — nothing built |
| IAP | Partial (no admin backend) | *(none)* | *(none)* | **UNSUPPORTED_BY_BACKEND** | No admin read endpoint exists server-side; don't build a page against nothing |
| Tasks | Not first-class (`RuleDefinition.kind='TASK'`) | `/dashboard/meta-game` (user-facing `/meta-game/tasks`) | `meta-game.service.ts` | **NEEDS VERIFICATION** | `meta-game.service.ts` hits `/meta-game/tasks`/`/meta-game/task-definitions` — these routes were **not** in the audited controller set for `meta-game.controller.ts`; must confirm they still exist before relying on them. Admin task **authoring** has no dedicated page today and must target `POST /admin/rules {kind:'TASK'}`, not meta-game |
| Achievements | Not first-class (`RuleDefinition.kind='ACHIEVEMENT'`) | `/dashboard/achievements` | `achievements.service.ts` | **BROKEN** | Calls `/admin/achievements/*` which does not exist (see finding #1). Read-only public routes (`/achievements`, `/achievements/me/*`) are fine; the CRUD is not |
| Rules / Rule Nodes | Full | *(none)* | *(none)* | **MISSING** | The single richest backend admin surface (draft/validate/preview/publish/disable/rollback, 60-node registry) has zero frontend |
| Reward Bundle V2 editor | Full | *(none — achievements page uses ad-hoc legacy `rewards` object instead)* | *(none)* | **MISSING** | Spec requires ONE shared editor reused across Rules/Tasks/Achievements/Campaigns/Levels/Tracks — none exists |
| Campaigns | Full | *(none)* | *(none)* | **MISSING** | |
| Player Levels | Full (legacy+V2 dual shape) | *(none)* | *(none)* | **MISSING** | Must handle `LevelConfig.rewardGameCurrency` (legacy, read-only display) alongside `rewardBundle` (V2, canonical for new writes) |
| Room Levels | Full (V2-only) | *(none)* | *(none)* | **MISSING** | |
| Progression Tracks | Full (V2-only) | *(none)* | *(none)* | **MISSING** | |
| Store items/bundles | Full | `/dashboard/store` | `store.service.ts` | **CONNECTED** | Recent commits show active alignment work (asset upload, CSP, purchase display) |
| Gifts catalog | Full | `/dashboard/gifts` | `gifts.service.ts` | **PARTIAL** | Catalog CRUD connected; `canManage=true` hardcoded (finding #4); gift revenue-split policy engine (`admin/gift-policies`) has no frontend |
| Rooms (global admin) | Full | `/dashboard/rooms` | `rooms.service.ts` | **PARTIAL** | List exists per `GAP_ANALYSIS` v1; no room detail page confirmed in current tree despite backend supporting `GET/PATCH/DELETE rooms/admin/rooms/:id` — needs a detail-page pass |
| Matches | Minimal (1 support-lookup route) | `/dashboard/matches` | `matches.service.ts` | **PARTIAL** | `matches.service.ts`/`routes.ts` reference full self-service match-history endpoints for admin display, which is reasonable since the backend genuinely has no richer admin surface — do not promise admin match management the backend can't do |
| Moderation | Full | `/dashboard/moderation` | `moderation.service.ts` | **CONNECTED** | |
| Reports | Full | `/dashboard/reports` | `reports.service.ts` | **CONNECTED** | |
| Notifications | No admin surface (self-service only) | `/dashboard/notifications` | `notifications.service.ts` | **UNSUPPORTED_BY_BACKEND (for broadcast)** | Current page can only be a self-service inbox; an admin "compose/broadcast" feature has no backend to call |
| Configs | Full | `/dashboard/settings` (gated on `manage_config`) | `configs.service.ts` | **CONNECTED** | |
| System Health | Full | *(none — only surfaced as widgets on `/dashboard` home)* | `health.service.ts` | **PARTIAL** | `/health/metrics` wired; `/health/redis`, `/health/system`, `/health/ready`, `POST /health/reset-circuits` unused; no dedicated `/dashboard/system/health` page |
| Audit | Backend gap — no read API | *(none)* | *(none)* | **UNSUPPORTED_BY_BACKEND** | Cannot build until backend adds a controller over the existing `AuditService` query methods — call this out to the backend owner explicitly |
| Ranks | Full (own module, not part of "economy") | `/dashboard/ranks` | `ranks.service.ts` | **CONNECTED** | Recently redesigned per commit history |
| Support/Tickets | Full | `/dashboard/support` | `support.service.ts` | **CONNECTED** | |
| Social | Full (admin sub-routes: friendships/blocks/mutes) | `/dashboard/social` | `social.service.ts` | **NEEDS VERIFICATION** | Confirm `social/admin/*` routes are wired, not just self-service ones |
| Voice | Full (self-service + admin mic override) | *(none dedicated)* | `voice.service.ts` | **PARTIAL** | Low priority per spec (no explicit admin page requested) |

---

## RBAC / architecture gaps (apply across every domain)

- **No central admin route registry** (spec target: `src/lib/admin/admin-routes.ts`). Today, permission-gated navigation lives only in [`Sidebar.tsx`](src/shared/components/layout/Sidebar.tsx:70), and it mixes legacy bitmask codes (`manage_roles`, `adjust_balance`, `global_ban`) with canonical dot-notation codes (`store.catalog_read`) inconsistently. New domains (Agents, Distributors, Finance, Rules, Progression) have canonical codes already minted server-side (`agents.read/write/execute`, `financial.execute`, `commissions.write`) — new nav entries should use these directly, not invent legacy-style names.
- **`PermissionGuard`/`AuthGuard`/`RoleRouteGuard` are dead code** — wire them into `dashboard/layout.tsx` (or per high-risk page) so unauthorized direct-URL access actually redirects to `/dashboard/unauthorized` (which exists at [`(auth)/unauthorized`](src/app/(auth)/unauthorized) but nothing currently routes to it from a permission failure).
- Permissions themselves ARE real (`/users/me/permissions` fetched from backend in [`auth.store.ts:144`](src/store/auth.store.ts:144)) — this part just needs to be *enforced*, not re-architected.
- `src/lib/api/routes.ts` is a decent API-contract map for the domains it covers, but has **zero entries** for Agents/Distribution/Reconciliation/Rules/Reward-Bundles/Progression/Campaigns/Commissions — needs a matching expansion alongside new services.

---

## Recommended Phase 2 priority order

**P0 — fix what's actively broken/unsafe (small, high-value, no new domains):**
1. Fix or gate off Achievements Admin (either rebuild against `/admin/rules kind=ACHIEVEMENT`, or clearly mark read-only until rebuilt) — currently silently broken.
2. Remove the two hardcoded `canManage=true` and the `ActionButtons` default; wire to real permission checks (`achievements.write`, `gifts.write`).
3. Wire `PermissionGuard`/route-level enforcement into the dashboard layout; verify direct-URL access is actually blocked for at least one under-permissioned role.
4. Replace the 3 fabricated dashboard KPI values with `N/A` when data is unavailable, and add the Redis/Nakama/DB status widgets that `/health/system` already returns but the frontend doesn't render.

**P1 — highest-value missing domains (backend fully ready):**
5. Rules / Rule Nodes / Reward Bundle V2 shared editor — this unlocks correct Achievements + Tasks + Campaigns + Levels admin all at once, so build it before rebuilding Achievements fully.
6. Agents admin (list/create/status/fund/sales/redemptions/topup review).
7. Distributors admin (list/create/status/rates/cashout settlement) + Commissions (policy draft/publish).
8. Finance overview page (`/dashboard/finance`) consolidating financial accounts by owner type, ledger explorer, reconciliation findings/run.

**P2 — progression & remaining domains:**
9. Player Levels, Room Levels, Progression Tracks admin (share the Reward Bundle V2 editor from step 5).
10. Campaigns admin.
11. System Health dedicated page (`/dashboard/system/health`) using the already-fetched-but-unused `/health/system`, `/health/redis` data.

**Flag to backend owner, not frontend work:**
12. Audit has no read endpoint — needs a backend controller before any frontend Audit page is possible.
13. IAP has no admin surface — needs a backend controller if IAP visibility is required in the admin panel.
14. Confirm whether `/meta-game/tasks` and `/meta-game/task-definitions` (used by `meta-game.service.ts`) still exist server-side — not verified in this audit pass.

---

## Pre-flight for implementation

- This worktree has **no `node_modules` installed** — `pnpm install` needed before any lint/build/test can run.
- No dedicated test runner beyond `eslint` in `package.json` (`dev`, `build`, `build:vps`, `start`, `lint` only) — no `tsc --noEmit`/jest/Playwright script exists yet; will need to add at least a typecheck script per spec §75-76.
