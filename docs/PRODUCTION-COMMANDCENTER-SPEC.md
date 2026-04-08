# Production CommandCenter — Specification (Step 2)

> Module redesign following the 3-step process: Philosophy (complete) → **Specification (this document)** → Implementation (blocked on spec approval).
>
> Reference pattern: Cultivation CommandCenter (`src/features/cultivation/components/CommandCenter.tsx`)
> Design system: `cultops_design_system_reference` in Context DB

---

## 1. What Gets Replaced

| Current Component | Disposition |
|---|---|
| `SessionsHub` (3-tab split: bucking/trim/packaging) | **Removed** |
| `SessionsUnified` (stacked tables) | **Removed** |
| `ProductionHub` (dispatch-driven tables) | **Removed** |
| `ProductionDashboard` (legacy) | **Removed** |
| Routes: `/sessions`, `/trim-sessions`, `/packaging-sessions` | **Collapsed** → single `/production` route |

## 2. What Stays Untouched (Non-Negotiable)

**Services:**
- `sessions.service.ts` — all CRUD operations
- `conversions.service.ts` — finalization logic, variance logging
- `inventoryMovement.service.ts` — the ledger

**Hooks (reuse as-is):**
- `useTrimSessions` — sessions, activeSessions, stats, fetchSessions
- `useBuckingSessions` — sessions, activeSessions, stats, fetchSessions
- `usePackagingSessions` — sessions, activeSessions, stats, fetchSessions
- `useActiveStaff` — staff list, getDisplayName
- `useBuckingData` — available totes for session start
- `usePackagingData` — available packages for session start
- `useSessionData` — buckedPackages, availableStrains, consolidatedPackages

**Existing UI (imported, not rebuilt):**
- `TrimSessionStartForm` / `BuckingSessionStartForm` / `PackagingSessionStartForm`
- `TrimSessionCompleteModal` / `BuckingSessionCompleteModal` / `PackagingSessionCompleteModal` (glass-treated in Phase 2)
- `TrimSessionCancelModal` / `BuckingSessionCancelModal` / `PackagingSessionCancelModal` (glass-treated in Phase 2)
- `ConversionModal` + `BulkBagCreationModal` (imported from inventory feature)

**Database (do not touch):**
- `finalize_session_aggregated` and `void_session_aggregated` RPCs
- `pending_conversion_sessions` view (6-branch UNION)
- Consolidation triggers (`trigger_consolidate_trim_session_output`, etc.)
- `toggle_session_pause` RPC
- `consolidated_packages` / `consolidated_package_sources` tables
- `inventory_movements` table

**Hooks from inventory (import for conversions panel):**
- `useFinalizationWorkflow` — pendingSessions, handleFinalize, handleVoid
- `useSessionContributions` — session breakdown for aggregated items

---

## 3. Philosophy Recap (Step 1 Decisions)

**Core Metaphor:** The Kitchen Ticket Rail. Tickets (packages) come in from dispatch, sessions get started, sessions get completed, outputs get finalized.

**Key Decisions:**
1. **Unified Floor** — All session types (trim, bucking, packaging) on one view, differentiated by color. No tab split by type.
2. **Two Views** — Floor (live production state) + Performance (analytics, operator stats, trends)
3. **Conversions Moves Here** — Finalization trigger lives in Production. Completes the full cycle: tickets in → sessions run → outputs finalized.
4. **Limited Inventory Access** — Shows available source packages for session starts, not full inventory management.
5. **Completed History Hides** — Not competing for attention on Floor. Lives in Performance view or behind a tap.

**Operational Context:** Laura is moving from post-production into a centralized Distribution role. The Production CommandCenter is designed for the **crew lead** as primary operator — they see the floor, assign work, manage sessions, finalize outputs. The dispatch queue is fed by Distribution (Laura), but managed in Production by the lead.

**Known Timer Issue:** Sessions have historically been batch-entered at EOD or paused and forgotten, skewing throughput data. The CommandCenter addresses this with stale session alerts and high-visibility pause states.

---

## 4. Session Type Colors

| Type | Color | Hex | Rationale |
|---|---|---|---|
| Bucking | Amber | `#F59E0B` | First step in pipeline, warm/raw |
| Trim | Emerald | `#10B981` | Core production step, green = growth |
| Packaging | Indigo | `#6366F1` | Final step, cool/refined |

Applied as: left border accent on cards, glass tint on expanded views, KPI grouping, type badges.

---

## 5. Screen 1: Floor View (Default)

### 5a. KPI Strip (top, full-width glass bar)

Horizontal row of glass KPI tiles across the top. Always visible.

| KPI | Source | Format |
|---|---|---|
| Active Sessions | Sum of all active across 3 hooks | Count + pulsing dot |
| Completed Today | Sum of completedToday from 3 hooks | Count |
| Daily Output | Sum of totalFlowerToday (trim) + totalFlowerToday (bucking) + totalUnitsToday (packaging) | Grams + units |
| Avg Throughput | Weighted avg of avgGramsPerHour (trim) | g/hr |
| Pending Conversions | `useFinalizationWorkflow().pendingSessions.length` | Count (amber if >0, red if any >3 days) |

### 5b. Main Panel (3/5 width) — The Ticket Rail

Vertical card stack. Cards grouped by status:

**Active Sessions (top section)**

Sorted by elapsed time descending (longest-running first — makes stale sessions visible).

Each card:
```
┌─────────────────���───────────────────────────────┐
│ ▌ [Type Color Bar]                              │
│ ▌  Laura M.                          ▶ 2h 14m  │
│ ▌  Violet Fog · 260405-VF · 454g        ⏸ ✕ ✓ │
│ ▌  Trim                                         │
└─────────────────────────────────────────────────┘
```

- **Left edge:** 4px color bar (amber/emerald/indigo by type)
- **Operator name:** Large text, primary
- **Strain + batch + input weight:** Secondary line
- **Type badge:** Small pill, type-colored
- **Elapsed time:** Live counter (uses `formatElapsedTime` from existing utils). Adjusts for `total_pause_minutes`.
- **Pause state:** If `is_paused`, elapsed time shows "PAUSED" in amber with pulse animation. Card gets amber border glow.
- **Stale alert:** If active >4 hours, card gets red urgency ring (same pattern as CommandCenter `statusRingStyle`).
- **Actions (right side, icon buttons):**
  - ⏸ Pause/Resume — calls `pauseSession()` / `resumeSession()` from `sessions.service.ts`
  - ✕ Cancel — opens existing `*CancelModal`
  - ✓ Complete — opens existing `*CompleteModal`

**Queued Items (below active)**

Source: `useProductionDispatch()` — dispatch items sent from Distribution.

Each card (dimmer glass, dashed border):
```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
  Violet Fog · 260405-VF · 1,200g
  Buck → Trim to Stock          [Priority: High]
                                   [ Start ▶ ]
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

- Strain + batch + weight
- Processing stage label + treatment type
- Priority badge (from dispatch item)
- **"Start" button** — opens appropriate start form (`TrimSessionStartForm`, `BuckingSessionStartForm`, or `PackagingSessionStartForm`) pre-populated with dispatch item data

**Empty state:** When no active sessions and no queued items:
```
All caught up — no active sessions or queued items.
                [ Start Session ▶ ]
```
The "Start Session" pill opens a type picker (buck/trim/package), then the appropriate start form.

### 5c. Secondary Panel (2/5 width) — Swappable Bento Cards

Three glass cards in the right column. Tapping any card **swaps its content into the main panel** (bento card swap pattern from design system).

Animation: Framer Motion `layoutId`, spring transition (stiffness 350, damping 30). Grid structure never changes — only content swaps.

#### Card 1: Conversions

Default (compact) view in right column:
```
┌─────────────────────────┐
│  ▣ Conversions      (3) │
│                         │
│  Violet Fog · Trim  454g│
│  Animal Tsu · Buck  1.2k│
│  Grease Mon · Trim  680g│
│                         │
│  3 awaiting finalization │
└─────────────────────────┘
```

- Count badge (amber if >0, red if any item >3 days old)
- Compact list: strain + type + weight, sorted by `last_completed_at` descending
- Tap → swaps into main panel as expanded list

Expanded (main panel) view:
- Full `PendingSessionCard` treatment (same data as current `ConversionsView`)
- Each item tappable → opens existing `ConversionModal`
- Session breakdown expandable for aggregated items (reuses `useSessionContributions`)
- "Back" action swaps ticket rail back into main panel

**Data source:** `useFinalizationWorkflow().pendingSessions`

#### Card 2: Crew

Default (compact) view:
```
┌─────────────────────────┐
│  👥 Crew           (5/7)│
│                         │
│  Laura M.   Trimming ●  │
│  Carlos R.  Bucking  ●  │
│  Ana P.     —        ○  │
│  ...                    │
└─────────────────────────┘
```

- Header: active/total staff count
- Each row: name, current assignment (session type + strain if active, "—" if idle), status dot (green = working, hollow = idle)
- Tap → expands into main panel with full detail per person (current session card, sessions completed today, throughput)

**Data source:** `useActiveStaff()` cross-referenced with active sessions from all 3 hooks

#### Card 3: Today's Output

Default (compact) view:
```
┌─────────────────────────┐
│  📊 Today           (12)│
│                         │
│  Trim  ████████░░  8    │
│  Buck  ███░░░░░░░  2    │
│  Pack  ██░░░░░░░░  2    │
│                         │
│  2.4 lbs flower output  │
└─────────────────────────┘
```

- Completed session count by type, mini progress bars
- Total output summary (lbs)
- Tap → expands into main panel with strain-grouped completed session list (design principle #12: strain-grouped data)
- Each completed session shows: operator, strain, input weight, output weight, g/hr, elapsed time

**Data source:** Completed sessions from all 3 hooks, filtered to today

---

## 6. Screen 2: Performance View

Toggled via a subtle pill toggle at top of page: `Floor | Performance`. State change, not route change.

### Layout: Bento grid, analytics-focused

#### Tile 1: Throughput Trend (col-span-2, row-span-2, large)
- Line chart: avg g/hr (trim), avg kg/hr (bucking), avg units/hr (packaging) over last 7 days
- Each line colored by session type
- Data source: completed sessions from last 7 days, grouped by date
- Hover shows daily detail

#### Tile 2: Operator Leaderboard (col-span-2, row-span-1, medium)
- Ranked by throughput (g/hr for trim, kg/hr for bucking, units/hr for packaging)
- Top 3 get gold/silver/bronze visual treatment
- Each row: rank, name, avg throughput, sessions completed, total output
- Filterable by session type via type-colored pills
- Data source: completed sessions today (default), toggleable to this week/month

#### Tile 3: Session Type Breakdown (col-span-1, row-span-1, small)
- Donut chart or segmented bar: bucking vs trim vs packaging volume today
- Shows both count and weight
- Type-colored segments

#### Tile 4: Variance Report (col-span-1, row-span-1, small)
- Input vs output weight variance
- Flags outliers (>5% variance from expected)
- Today's waste total
- Data source: completed sessions comparing `pulled_weight` to output totals

#### Tile 5: Completed History (col-span-2, row-span-2, large)
- Full completed sessions table with filters:
  - Date range picker
  - Session type filter
  - Operator filter
  - Strain filter
- Columns: Date, Operator, Strain, Type, Input, Output, g/hr, Duration
- Paginated (addresses known LIMIT 100 constraint)
- Strain-grouped option toggle
- Data source: `getTrimSessions()`, `getBuckingSessions()`, `getPackagingSessions()` with date filtering

---

## 7. Conversions Integration Detail

### What moves from Inventory to Production

The conversions **UI** moves. The conversions **service** stays in `src/features/inventory/services/conversions.service.ts` (imported, not copied).

**Components imported as-is:**
- `ConversionModal` (from `@/features/inventory/components/ConversionModal`)
- `BulkBagCreationModal` (from `@/features/inventory/components/BulkBagCreationModal`)

**Hooks imported as-is:**
- `useFinalizationWorkflow` (from `@/features/inventory/hooks`)
- `useSessionContributions` (from `@/features/inventory/hooks/useSessionContributions`)

**Flow unchanged:**
1. Completed sessions appear in pending list (via `pending_conversion_sessions` view)
2. Lead taps a pending item → `ConversionModal` opens
3. For bulk: "Create Bulk Bags" → `BulkBagCreationModal`
4. For packaged: "Finalize Session" → direct finalize
5. Optional: adjust for moisture loss/variance before finalizing
6. Optional: void with reason

**What changes:** Discovery. Instead of navigating to Inventory → Conversions tab, the pending count is **always visible** on the Conversions bento card. Stale items (>3 days) get red urgency treatment. When a session completes on the Floor view, the conversions count badge increments in real-time.

**What stays in Inventory:** `ConversionsView` remains accessible in the Inventory module for the dedicated inventory person (future role). It becomes a secondary access point, not the primary one.

---

## 8. TV Performance Board (Fast-Follow)

Separate route: `/production/tv`

Full-screen, no nav bar. Auto-refreshing (30s via Supabase realtime). Optimized for wall-mounted display — large numbers, high contrast, minimal text.

### Layout: 3-column glass grid

**Top Bar — Live Pulse**
- Current time (updates every minute)
- "X Active Now" with pulsing green dot
- Total completed today (all types)
- Total grams processed today

**Column 1: RIGHT NOW**
- Simplified active session cards (name, strain, elapsed time, type color)
- Paused sessions: amber highlight
- Stale sessions (>4hr): red highlight
- Queued items count

**Column 2: TODAY'S SCOREBOARD**
- "Fastest Trim" callout — name + g/hr, gold highlight
- Operator leaderboard ranked by throughput
- Top 3 get gold/silver/bronze medals
- Each row: name, throughput, sessions completed
- Grouped by session type with colored headers

**Column 3: THE BIGGER PICTURE**
- **This Month:** Top trimmer, top bucker, top packager (cumulative avg throughput)
- **Total output this month** (lbs)
- **What's Coming:** Queued dispatch items (strain + weight)
- **Pending Conversions** count
- **Strain of the Day:** Highest volume strain today

**Bottom Strip — Daily Output Bar**
- Horizontal segmented bar: bucking (amber) + trim flower (emerald) + trim smalls (lighter emerald) + packaged units (indigo)
- Running total in lbs

### Data Sources
- Same hooks as Floor/Performance views
- New: `useMonthlyLeaderboard` — completed sessions this month grouped by operator, avg throughput (simple query, no new DB objects)

### Metrics (speed only, quality normalization is future work)
- g/hr (trim), kg/hr (bucking), units/hr (packaging)
- Session count per operator
- Total output per operator
- Monthly cumulative averages

---

## 9. Component Tree (New Files)

```
src/features/sessions/components/production/
  ProductionCommandCenter.tsx    — Route-level orchestrator, Floor/Performance toggle
  FloorView.tsx                  — Ticket rail + secondary bento cards
  PerformanceView.tsx            — Analytics bento grid
  SessionCard.tsx                — Unified active session card (all 3 types)
  QueuedCard.tsx                 — Dispatch queue item card
  ConversionsPanel.tsx           — Pending conversions bento card (compact + expanded)
  CrewPanel.tsx                  — Active staff bento card (compact + expanded)
  DailySummaryPanel.tsx          — Today's output bento card (compact + expanded)
  ProductionKpiStrip.tsx         — Top KPI bar
  TVPerformanceBoard.tsx         — Full-screen TV display (fast-follow)
```

All new files in a `production/` subdirectory. Existing components untouched.

---

## 10. Route Changes

```diff
- { path: '/sessions', element: <SessionsUnified /> }
- { path: '/trim-sessions', element: <TrimSessions /> }
- { path: '/packaging-sessions', element: <PackagingSessions /> }
+ { path: '/production', element: <ProductionCommandCenter /> }
+ { path: '/production/tv', element: <TVPerformanceBoard /> }  // fast-follow
```

Old routes removed. Nav updated to point to `/production`.

---

## 11. Interactions Summary

| Action | Trigger | Result |
|---|---|---|
| Start session from queue | Tap queued card → "Start" | Opens appropriate `*StartForm` pre-populated |
| Start session manually | Tap "Start Session" pill (empty state or floating action) | Type picker → `*StartForm` |
| Complete session | Tap ✓ on active card | Opens appropriate `*CompleteModal` |
| Cancel session | Tap ✕ on active card | Opens appropriate `*CancelModal` |
| Pause/Resume | Tap ⏸ on active card | Calls `pauseSession()` / `resumeSession()` |
| Finalize conversion | Tap pending item in expanded conversions panel | Opens `ConversionModal` |
| Swap bento card | Tap any secondary card | Content swaps to main panel (layoutId spring) |
| Swap back | Tap "Back" or click another card | Rail returns to main panel |
| Toggle Floor/Performance | Tap view pill | State toggle, no route change |

---

## 12. What Is NOT On This Screen

- Full inventory management (separate module)
- Dispatch/delivery creation (Distribution module — Laura's domain)
- Batch planning or pipeline boards (production-queue feature, separate)
- Admin session editing/deletion (admin tools only)
- Label printing (triggered by finalization flow, not standalone)
- Harvest sessions (Cultivation module)
- Quality grading (future — no consistent capture process yet)
- Strain difficulty normalization for leaderboards (future)

---

## 13. Known Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Finalization RPC has no explicit transaction wrapper | Pre-existing | Don't change RPC. Document as known landmine. |
| `getTrimSessions()` hardcoded LIMIT 100 | Moderate | Performance view paginated. Floor only shows active (no limit issue). |
| Simultaneous completions on same strain/batch could collide on package ID generation | Pre-existing | Don't change triggers. Document. |
| `useProductionDispatch()` may need adjustment for new card format | Low | Normalize dispatch items in FloorView, don't modify hook internals. |
| Timer data historically unreliable (batch entry, forgotten pauses) | Operational | Stale alerts (>4hr) and prominent pause state make issues visible. |
