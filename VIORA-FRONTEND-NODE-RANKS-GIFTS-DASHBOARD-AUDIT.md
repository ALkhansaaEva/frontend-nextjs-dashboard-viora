# VIORA frontend-first dashboard audit

Date: 2026-08-24

## Result

Frontend navigation, RTL/mobile layout, Rule Builder authoring, Settings currency presentation, and Progression policy UX were repaired without rewriting the Sidebar or Rule Builder. Backend changes were limited to a proven runtime contract defect: `room.maxMembers` existed as an editable setting but was not used by room creation or admission.

## Sidebar and layout

- Dashboard navigation no longer re-runs the application authentication bootstrap on every pathname change.
- Internal Settings/Meta Game navigation uses Next.js `Link`.
- RTL content padding uses logical-start spacing, so dashboard pages no longer render beneath the right-side Sidebar.
- A collapsed desktop Sidebar preference no longer produces an 80px mobile drawer.
- The mobile drawer is full width, uses a single overlay/body scroll lock, and sits above the Header.
- Duplicate resize/overlay/loading layout work was removed.

## Rule Builder

- Node Inspector remains an embedded side rail; it is not a dialog.
- Achievement and Task Basic Info are compact summaries edited in dialogs.
- The canvas is isolated as LTR typed data flow so Arabic document direction does not invert handles, ports, graph order, or editor overlays.
- Mobile canvas has a stable viewport; node cards use responsive dimensions and readable dark-mode contrast.
- MiniMap is visible at phone size, has bounded responsive dimensions, and colors nodes by backend registry kind instead of rendering an indistinct dark map.
- Read-only status no longer overlaps Undo/Redo.
- New nodes are placed collision-free and click-added nodes connect to the selected predecessor only when both topology and typed-port compatibility pass.
- Every node card renders the backend descriptor's real input/output handles.
- Registry-driven config remains authoritative:
  - `Lifetime` and `CountEvents` intentionally have fixed runtime behavior and no author-entered values.
  - `Increment` exposes optional `Amount` with default `1` and positive BIGINT validation.
  - `HasCompletedTask` exposes a required Task reference picker.
  - Required/invalid configuration blocks client validation; backend compile/validate remains final authority.
- The config form is one readable column inside the narrow Inspector, avoiding previously crushed/hidden controls.

## Settings and currency display

- Settings opens on Feature Flags and uses responsive, scroll-safe tabs.
- Currency display has an actual image upload control with preview, file type/size validation, permission checks, clear/fallback behavior, and canonical media reference normalization.
- Canonical currency icon contract is `/v1/media/proxy/{bucket}/{filename}`.
- Display name, audit reason, and upload state gate save correctly.
- `room.maxMembers` is labeled as the live room member capacity ceiling and validated at 2–200.

## Progression and rooms

- Policy draft creation reflects the active max level and proposes the next real version instead of resetting to v1/L100.
- Policy table is horizontally scrollable on narrow screens.
- Room Levels explicitly owns XP, mic slots, default seats, and maximum seats.
- Settings explicitly owns the live room member admission ceiling.
- Backend room admission now:
  - defaults new room capacity from live `room.maxMembers`;
  - rejects requested capacity above the configured ceiling;
  - uses a room-scoped PostgreSQL advisory transaction lock;
  - counts active members before charge/admission;
  - blocks full rooms without charging;
  - preserves idempotent retries for already-active members;
  - applies a lowered global ceiling immediately without evicting current members.

## Verification

Frontend:

- TypeScript: PASS
- ESLint: PASS
- Vitest: 23 files, 124 tests PASS
- Next.js 16.2.3 production build: PASS

Backend:

- Focused Jest: 2 suites, 31 tests PASS
- Nest production build: PASS (895 files)
- Docker context: `devobject-vm`
- Deployed image: `sha256:75c3270e6ab848264eff8d949a53a5ba97a8a42492feb4d5f36a92c79c2ca0b2`
- Container health: healthy
- API verification: 46 PASS, 0 FAIL
- Full room lifecycle: 75 PASS, 0 FAIL, 2 optional skips, 2 warnings
- Live container registry artifact confirms `Increment.amount` and `HasCompletedTask.value` schemas.
- Backend and frontend Graphify indexes updated.

## Remaining product-contract boundary

The existing competitive ranking API supports game leaderboards. A unified global leaderboard for room rounds, rooms, and users within rooms is not present as an authoritative backend contract. The frontend should not invent or locally calculate those rankings; they require explicit ranking semantics, pagination, tie rules, season/window rules, and an authorized backend read model before a production section can be completed.

## Visual verification note

The in-app browser tab was visible in ambient state but did not attach to the browser-control session, so this run could not capture authenticated desktop/mobile screenshots. Static validation, tests, lint, and production builds passed; an authenticated visual pass should be performed after the tab becomes controllable.

## Mobile layout hardening — follow-up

- Removed double horizontal padding from the dashboard shell; phone content now starts at a consistent 12px safe gutter.
- Cards use responsive padding/radii and always constrain children to their available width.
- Card content owns horizontal overflow, while multi-column tables receive a bounded mobile minimum width and momentum scrolling instead of being clipped by the page.
- Page headings scale down on phones; descriptions wrap naturally and action buttons wrap/fill available width.
- Modals behave as mobile bottom sheets with dynamic viewport height, then return to centered dialogs on larger screens.
- The login card uses compact phone spacing and an explicit LTR form contract so a persisted Arabic locale cannot invert its English controls.
- Rule Builder mobile mode now exposes one internal pane at a time: Library, Canvas, or Inspector.
- Adding a node returns to Canvas; tapping a node opens Inspector; desktop retains the simultaneous three-pane layout.
- Node library, Canvas, and Inspector share the same stable 68svh mobile workspace height.
- Bottom-panel tabs scroll horizontally and the expanded panel uses a viewport-bounded mobile height.
- Toolbar actions scroll safely on narrow screens instead of compressing or escaping the builder.

Follow-up verification:

- TypeScript: PASS
- ESLint: PASS
- Vitest: 23 files, 124 tests PASS
- Next.js production build: PASS
