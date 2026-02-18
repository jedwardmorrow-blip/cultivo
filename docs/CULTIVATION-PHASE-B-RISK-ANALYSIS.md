---
title: Cultivation Pre-Work — Phase B Risk Analysis
category: Planning & Architecture
updated: 2026-02-18
priority: Read before executing Phase B pagination work
---

# Cultivation Pre-Work — Phase B Risk Analysis

> **Purpose:** Detailed risk analysis for Phase B (Pagination) items identified in
> `docs/SYSTEM-HEALTH-ASSESSMENT.md`. Answers: What queries need limits? What is the right
> limit value? What could break?
>
> **Read this document when:** An AI session is about to add pagination to list queries before
> or during cultivation module rollout.

---

## Why Phase B Exists

Currently, 18 `.limit()` or `.range()` calls exist across all features. The vast majority of
these are `.limit(1)` (fetching a single row) or defensive range calls inside two services
(`combine.service.ts` and `adjustment.service.ts`). No list-view query for inventory, sessions,
or orders has a defensive upper bound.

With post-production inventory at current scale this is acceptable. Once the cultivation module
adds plant tracking (potentially thousands of rows per cycle), uncapped queries will degrade
performance and may time out.

**`select('*')` compounds the problem.** Six queries in `inventory.service.ts` and five in
`sessions.service.ts` use `select('*')`. This fetches every column for every row — including
columns that list views never display. At 1,000+ rows this is significant unnecessary data
transfer.

---

## Phase B Overview

| Item | File(s) | Risk Level | Behavior Change? |
|------|---------|------------|-----------------|
| B1 | `inventory.service.ts` | Low | Yes — list views cap at 100 rows |
| B2 | `sessions.service.ts` | Low | Yes — history views cap at 100 rows |
| B3 | Multiple services | Low-Medium | Yes — fewer columns returned |

**Behavior change note:** These ARE visible behavior changes. A user who has more than 100 items
will see a capped list. Phase B must be paired with UI indicators or "load more" controls.
Phase B should be done in two sub-steps: (1) add the cap with a note in the UI, (2) add "load more"
UI if needed.

---

## B1: Add Defensive Limit to Inventory List Queries

### What is the issue?

The following queries in `src/features/inventory/services/inventory.service.ts` fetch
unlimited rows:

| Function | Table | No limit |
|----------|-------|----------|
| `getInventoryItems()` | `inventory_items` | Yes |
| `getInventoryItemsByStage()` | `inventory_items` | Yes |
| `getInventoryItemsByBatch()` | `inventory_items` | Yes |
| `getAllInventoryItems()` | `inventory_items` | Yes |
| `getInventoryMovements()` | `inventory_movements` | Yes |
| `getInventorySnapshots()` | `inventory_snapshots` | Yes |

`inventory_movements` is an append-only ledger. Every inventory operation appends a row.
After a year of operation this table will have tens of thousands of rows. Fetching all of them
on every movement history view will eventually fail with a timeout.

### What is the risk?

**Risk of doing nothing:** Low today, will become a hard failure as plant tracking scales.
The `inventory_movements` table is the highest-volume risk — the ledger grows every session.

**Risk of the fix:** Low, with one exception. Adding `.limit(100)` to `getInventoryMovements()`
changes what the movement history view shows. If any compliance report or audit export relies on
the movement service returning the complete history, capping it will silently truncate the report.

**Before implementing B1, check:** Does `VarianceLogViewer.tsx`, `AuditManagement.tsx`, or any
PDF export call `getInventoryMovements()` expecting the complete history for a date range?

If yes: add a second uncapped variant (e.g., `getAllInventoryMovementsForExport()`) and cap only
the list-view variant.

### The right limit value

Use `100` as the default cap for list views. This is consistent with the one existing defensive
cap in `varianceLog.service.ts`:
```typescript
const { data, error } = await query.limit(100);
```

For movement history (audit use), use `500` — auditors typically review longer windows.

### Safe execution steps

1. Search for all callers of `getInventoryMovements()` to determine if any are audit/export paths:
   ```bash
   grep -rn "getInventoryMovements" src/
   ```
   For each caller: is it displaying a UI list (cap at 100) or generating an export (do not cap)?

2. Add `.limit(100)` to each list-view query. For `getInventoryMovements`, add a `limit` parameter
   with a default:
   ```typescript
   export async function getInventoryMovements(filters?: {...}, limit = 100)
   ```

3. Check `InventoryOversightDashboard.tsx` and `DailyInventoryActivity.tsx` — they are the primary
   list consumers. Verify rendered row count is sensible after capping.

4. Run `npm run build`. Must pass.

### Do NOT

- Do NOT cap `getInventoryItem(id)` single-row lookups — they already use `.eq('id', id)` which
  implicitly returns 1 row
- Do NOT cap queries inside `audit.service.ts` that are used for audit sheet generation —
  auditors need complete data
- Do NOT add pagination UI in Phase B — Phase B is defensive caps only; pagination UI is Phase B+

---

## B2: Add Defensive Limit to Sessions History Queries

### What is the issue?

The following queries in `src/features/sessions/services/sessions.service.ts` fetch unlimited rows:

| Function | Table | No limit |
|----------|-------|----------|
| `getTrimSessions()` | `trim_sessions` | Yes |
| `getCompletedTrimSessions()` | `trim_sessions` | Yes |
| `getBuckingSessions()` | `bucking_sessions` | Yes |
| `getCompletedBuckingSessions()` | `bucking_sessions` | Yes |
| `getPackagingSessions()` | `packaging_sessions` | Yes |
| `getCompletedPackagingSessions()` | `packaging_sessions` | Yes |

With 3 session types in post-production plus the upcoming cultivation session types (grow
sessions, harvest sessions), the history tables will accumulate quickly. A single week of
operations could produce 50+ session rows. Over a year, 2,000+ rows per session table is
realistic.

The "active sessions" queries are low risk (only 1-3 rows at any time). The "completed sessions"
history queries are the concern.

### What is the risk?

**Risk of doing nothing:** Low now. A year from now, opening the Sessions history tab will be
noticeably slow.

**Risk of the fix:** Very low for active sessions (they are naturally bounded). For completed
sessions, the cap changes which historical sessions are visible. The safest approach:
- Active sessions: no cap needed (always small)
- Completed sessions: cap at 100, order by `completed_at DESC` so recent sessions always appear

**Important:** All completed session queries should already be ordered by date descending.
Verify the `order()` call exists before adding the cap — capping without ordering would show
arbitrary rows.

### Safe execution steps

1. In `sessions.service.ts`, check each `getCompleted*` function for an `.order()` call:
   ```bash
   grep -A5 "getCompletedTrimSessions\|getCompletedBucking\|getCompletedPackaging" src/features/sessions/services/sessions.service.ts
   ```
   If `.order()` is missing, add `.order('completed_at', { ascending: false })` before `.limit(100)`.

2. Add `.limit(100)` only to completed/history queries. Do NOT add limits to active session queries.

3. Run `npm run build`. Must pass.

4. Verify the `CompletedSessionsTable.tsx`, `CompletedBuckingSessionsTable.tsx`, and
   `CompletedPackagingSessionsTable.tsx` components render correctly with capped data.

### Do NOT

- Do NOT add limits to `getActiveTrimSessions()`, `getActiveBuckingSessions()`,
  `getActivePackagingSessions()` — active sessions are inherently bounded and must show all
- Do NOT skip adding `.order()` before `.limit()` — a limit without order is non-deterministic
- Do NOT apply limits inside the Conversions module's session queries — `getPendingConversions()`
  must return all pending sessions for the finalization workflow to work correctly

---

## B3: Replace select('*') with Explicit Column Lists

### What is the issue?

`inventory.service.ts` and `sessions.service.ts` use `select('*')` on list queries. For
`inventory_items`, this fetches all columns including:
- `notes` (potentially long text)
- `created_at`, `updated_at` (not displayed in list views)
- Multiple foreign key ID columns not shown in the UI

For `trim_sessions`, `bucking_sessions`, and `packaging_sessions`, this fetches completion
data columns (individual gram counts per output type) even when only displaying the session
header row in a table.

### What is the risk?

**Risk of doing nothing:** Low-Medium. Over-fetching is wasteful but not harmful. As rows scale
with cultivation, the bandwidth cost of `select('*')` on history lists will compound with the
pagination issue above.

**Risk of the fix:** Medium — this is the highest-risk item in Phase B. The reason:

Every component that consumes the list data accesses fields from the returned rows. If a field
is removed from the select list, the component will get `undefined` for that field at runtime.
TypeScript will NOT catch this because the Supabase return type is inferred from the columns
selected — only `tsc --noEmit` on the caller file will catch it, and only if the component's
props are properly typed.

**Recommended approach:** Do B3 after B1 and B2. Do it feature by feature, not globally. For
each query changed, audit every consumer component to confirm the removed columns are not
accessed.

### Safe execution steps for each query

1. Identify all consumers of the function being changed (e.g., `getInventoryItems()`):
   ```bash
   grep -rn "getInventoryItems\b" src/
   ```

2. For each consumer component, review which fields it accesses from the returned data.
   Build a complete set of required fields.

3. Replace `select('*')` with the explicit column list:
   ```typescript
   .select('id, strain, product_name, quantity_grams, stage, batch_id, created_at')
   ```

4. Run `npx tsc --noEmit` (not just `npm run build`) — the build uses esbuild which does NOT
   catch missing properties. Only `tsc --noEmit` will surface `Property 'X' does not exist`
   errors.

5. Fix any type errors before moving to the next query.

### Priority order for B3

Start with the queries that serve the largest list views:

| Priority | Function | Table | Typical row count |
|----------|----------|-------|------------------|
| 1 | `getInventoryMovements()` | `inventory_movements` | Highest volume |
| 2 | `getCompletedTrimSessions()` | `trim_sessions` | High over time |
| 3 | `getAllInventoryItems()` | `inventory_items` | Moderate |
| 4 | `getInventoryItems()` | `inventory_items` | Moderate |

**Skip for now:** Session start forms that need all fields for pre-population,
and any query that feeds into a PDF export (full data needed).

### Do NOT

- Do NOT do B3 in the same commit as B1 or B2 — keep changes isolated
- Do NOT use `tsc` shorthand — only `npx tsc --noEmit -p tsconfig.app.json` checks the right config
- Do NOT remove FK ID columns (e.g., `strain_id`, `batch_id`) even if they're not displayed —
  they are often used for navigation or as keys in downstream operations
- Do NOT change query functions that are also used by the conversion finalization workflow
  (`getInventoryItems` is used in `useConversionWorkflow.ts`)

---

## Phase B Execution Order

```
B1 first  → Caps inventory queries; audit export paths first; lowest conceptual risk
B2 second → Caps session history queries; verify order() exists before limit()
B3 last   → Column selection; highest risk item; do tsc --noEmit after each function
```

---

## Risk Summary Table

| Item | Existing Features at Risk | Risk Level | Rollback Difficulty |
|------|--------------------------|------------|---------------------|
| B1 | Inventory list views, movement history | Low | Easy: remove `.limit()` calls |
| B2 | Session history tables | Low | Easy: remove `.limit()` calls |
| B3 | All inventory and session consumers | Medium | Medium: restore `select('*')` per function |

---

## Phase B Relationship to Cultivation

Phase B is not strictly required before cultivation scaffolding, but it IS required before
the first cultivation session history view goes live. Grow sessions will accumulate rows
faster than post-production sessions (one grow session per plant, potentially hundreds per cycle).
Build the pagination cap into the cultivation session service from day one — do not copy the
`select('*')` pattern from the existing session services.
