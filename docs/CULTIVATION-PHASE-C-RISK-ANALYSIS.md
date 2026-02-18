---
title: Cultivation Pre-Work — Phase C Risk Analysis
category: Planning & Architecture
updated: 2026-02-18 (C1 + C3 complete)
priority: Read before executing Phase C service refactoring
---

# Cultivation Pre-Work — Phase C Risk Analysis

> **Purpose:** Detailed risk analysis for Phase C (Service Refactoring) items identified in
> `docs/SYSTEM-HEALTH-ASSESSMENT.md`. Covers splitting `conversions.service.ts`, wiring
> `retryOperation`, and standardizing error return patterns.
>
> **Read this document when:** An AI session is about to refactor services in preparation for
> the cultivation module.

---

## Phase C Overview

Phase C is the highest-risk phase in the pre-cultivation work. It involves restructuring the
core service layer — files that are directly involved in inventory balance calculations,
session finalization, and the audit trail. A mistake here can produce silent data corruption
or broken finalization workflows.

**Phase C must not be started until Phase A is complete.** Phase A's session typing work (A3)
will surface exactly which parts of the session service are consumed and by what, giving Phase C
the accurate dependency map it needs.

| Item | File(s) | Risk Level | Behavior Change? | Status |
|------|---------|------------|-----------------|--------|
| C1 | `conversions.service.ts` (1,026 lines) | High | No (restructure only) | **COMPLETE** (2026-02-18) |
| C2 | `inventoryMovement.service.ts` | Low | No | Pending |
| C3 | All services | Medium | No (return pattern only) | **COMPLETE** (2026-02-18) |

---

## C1: Split conversions.service.ts

### What is the issue?

`src/features/inventory/services/conversions.service.ts` is 1,026 lines and contains 7 distinct
responsibilities:

| Section (line range) | Responsibility |
|---------------------|----------------|
| 1-129 | Helper utilities: stage ID lookup, product name parsing, category mapping |
| 130-420 | Finalization RPCs: `getPendingConversions`, `finalizeConversion`, `voidConversion` |
| 421-570 | Session contribution queries: `getSessionContributions` |
| 571-609 | Analytics summary: `getConversionSummary`, `getConversionHistory` |
| 610-686 | Package ID generation: `generateNextPackageId`, `generatePackageIds` |
| 687-851 | Variance logging: `calculateVariance`, `logVariance`, `getVariances` |
| 852-1026 | Package CRUD: `createConversionPackages`, `createConsolidatedPackage`, `finalizeConversionPackages`, `getPackages` |

The cultivation module will add harvest-to-trim conversion flows and cultivation-specific
finalization logic. Adding these to the existing file will push it past 1,500 lines.

### What are the consumers?

The service is consumed by 5 hooks and 1 barrel:

| Consumer | Functions imported |
|----------|--------------------|
| `useConversionWorkflow.ts` | `finalizeConversion`, `voidConversion`, `getProductStageIdFromProductName`, `getCategoryFromProductName`, `createConversionPackages`, `createConsolidatedPackage`, `generateNextPackageId`, `generatePackageIds`, `logVariance` |
| `useFinalizationWorkflow.ts` | `getPendingConversions`, `finalizeConversion`, `voidConversion`, `getProductStageIdFromProductName`, `getCategoryFromProductName`, `finalizeConversionPackages`, `logVariance` |
| `useConversionLots.ts` | `getConversionSummary`, `getPendingConversions` |
| `useSessionContributions.ts` | `getSessionContributions`, `SessionContribution` (type) |
| `src/features/inventory/services/index.ts` | `export * from './conversions.service'` — all exports re-exported |

The barrel export (`export * from './conversions.service'`) means ALL exports are currently
available via `@/features/inventory/services`. Any new split must also update this barrel.

### What is the risk?

**Risk of doing nothing:** Low-Medium today. High when cultivation adds new conversion types.
Splitting now while the service is self-contained is significantly safer than splitting
after cultivation code has been added inside the same file.

**Risk of the split:** High. The reason is the barrel re-export pattern. When the file is
split into 4 new files, the barrel must export from all 4 new files. Any import that reaches
`conversions.service.ts` directly (not through the barrel) will need its import path updated.
There are currently 4 direct imports (from the 4 hooks above). Missing one will produce a
runtime "not a function" error — not a build error and not a TypeScript error.

**Critical risk: the `stageIdCache` module-level variable.** This cache lives at module scope:
```typescript
let stageIdCache: Record<string, string> | null = null;
```
It is used by `getStageIdMap()` which is called by `getProductStageIdFromProductName()` and
`getCategoryFromProductName()`. If the split puts the cache and the functions that use it into
different files, the cache will NOT be shared between them. Both functions will independently
hit the database on first call. This is not a correctness bug (both will get the right data)
but it doubles the database calls. The fix is to keep `getStageIdMap()` and `stageIdCache` in
the same file as all consumers of the cache.

**Second critical risk: error pattern mismatch.** The existing `conversions.service.ts`
throws errors (see: `throw new Error(...)` at lines 43, 147, 176, 207, 238, 251, 256, 261, 305,
401, 405, 417, 451, 470). The OTHER services (`inventory.service.ts`, `sessions.service.ts`)
return `{ data, error }`. If new cultivation services are modeled after `conversions.service.ts`,
cultivation callers will also throw. If they are modeled after `sessions.service.ts`, they will
return. This inconsistency makes it impossible to write a generic error handler. See C3 for the
error pattern standardization work that should happen before or alongside C1.

### Proposed split

| New file | Responsibility | Exports |
|----------|---------------|---------|
| `conversions.helpers.ts` | Stage ID cache, `getProductStageIdFromProductName`, `getCategoryFromProductName`, `parseNetWeightFromProductName` | All helper functions |
| `conversions.finalization.ts` | `getPendingConversions`, `finalizeConversion`, `voidConversion` | Core workflow functions |
| `conversions.packages.ts` | `createConversionPackages`, `createConsolidatedPackage`, `finalizeConversionPackages`, `getPackages`, `generateNextPackageId`, `generatePackageIds` | Package CRUD and ID generation |
| `conversions.variance.ts` | `calculateVariance`, `logVariance`, `getVariances`, `SessionContribution`, `getSessionContributions` | Variance and contribution queries |
| `conversions.analytics.ts` | `getConversionSummary`, `getConversionHistory` | Read-only analytics |

The `conversions.service.ts` filename is kept as a thin re-export barrel:
```typescript
export * from './conversions.helpers';
export * from './conversions.finalization';
export * from './conversions.packages';
export * from './conversions.variance';
export * from './conversions.analytics';
```

**Why keep the old filename as a barrel?** Because `src/features/inventory/services/index.ts`
already does `export * from './conversions.service'`. Keeping `conversions.service.ts` as a
pass-through barrel means zero changes are needed to the existing service barrel or any consumer
that imports from `@/features/inventory/services`.

### Safe execution steps

1. **Do NOT start C1 until Phase A3 is complete.** A3 types the session service parameters and
   surfaces all callers. Review those callers to confirm none also call conversion functions.

2. Create all 5 new files with their content. Do NOT delete `conversions.service.ts` yet.

3. Replace the content of `conversions.service.ts` with:
   ```typescript
   export * from './conversions.helpers';
   export * from './conversions.finalization';
   export * from './conversions.packages';
   export * from './conversions.variance';
   export * from './conversions.analytics';
   ```

4. Run `npm run build`. If the build fails, a named export is duplicated or missing across files.
   Fix before proceeding.

5. Run `npx tsc --noEmit`. Record new error count vs. baseline.

6. Test the conversion finalization workflow end-to-end (open a pending conversion, finalize it)
   before committing.

### Do NOT

- Do NOT move `stageIdCache` and `getStageIdMap` to a different file than their consumers
- Do NOT rename any exported function names — only move them between files
- Do NOT change any function bodies during the split — restructure only
- Do NOT change the `conversions.service.ts` to export a `default` — it must remain named exports
- Do NOT split this in the same session as C2 or C3 — too many simultaneous changes

---

## C2: Wire retryOperation into inventoryMovement.service.ts

### What is the issue?

`src/services/error.service.ts` exports `retryOperation` — a utility for retrying async
operations with exponential backoff:

```typescript
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delay: number
): Promise<T>
```

This utility is defined and tested (see `src/__tests__/unit/services/error.service.test.ts`)
but is not called anywhere in the application. Every service makes single-attempt calls.

`inventoryMovementService.recordMovement()` is the highest-stakes write in the system —
it appends to the immutable inventory ledger. A transient Supabase network error on this call
produces a visible error notification and requires the user to manually retry. If the user
does not retry, the inventory balance becomes stale.

### What is the risk?

**Risk of doing nothing:** Low-Medium. Transient failures on `recordMovement` will leave
inventory in an incorrect state until manually corrected. This risk is higher in production
where network conditions vary.

**Risk of the fix:** Low. `retryOperation` wraps the existing call with no logic changes.
The only behavioral change is that a transient failure gets 3 automatic retry attempts before
surfacing to the user.

**One important constraint:** `recordMovement` must NOT be retried after a database constraint
violation (e.g., ATP constraint). Retrying a constraint violation will produce the same error
3 times and delay the user's error notification. The retry should only apply to network/timeout
errors, not to `code: '23514'` (check constraint) or `code: '23505'` (unique violation).

The `errorService.categorizeError()` function already distinguishes error types (NETWORK,
VALIDATION, DATABASE, etc.). Use this to conditionally retry:
```typescript
const shouldRetry = (error: unknown) => {
  const category = errorService.categorizeError(error as Error);
  return category === 'NETWORK' || category === 'UNKNOWN';
};
```

### Safe execution steps

1. Read `src/services/inventoryMovement.service.ts` to find the `recordMovement` Supabase call.

2. Import `retryOperation` and `errorService` (both already exported from `@/services`).

3. Wrap only the Supabase `.insert()` call inside `retryOperation`, not the entire function.
   The pre-condition checks (batch ID validation, etc.) should NOT be retried.

4. Run `npm run build`. Must pass.

5. Verify the existing `error.service.test.ts` still passes: `npm run test:run`.

### Do NOT

- Do NOT wrap the entire `recordMovement` function in `retryOperation` — only the DB write
- Do NOT retry on constraint violations (ATP check, unique constraint) — use `categorizeError`
- Do NOT add retry to every service — start with `recordMovement` only; expand after verifying
- Do NOT change the function signature of `recordMovement` — only internal behavior changes

---

## C3: Standardize Error Return Pattern Across Services

### What is the issue?

The codebase has two incompatible error patterns:

**Pattern 1 — Return `{ data, error }` (used by `inventory.service.ts`, `sessions.service.ts`, `customers.service.ts`):**
```typescript
async function getItems() {
  const { data, error } = await supabase.from(...).select('*');
  if (error) return { data: null, error };
  return { data, error: null };
}
```
Callers check: `if (result.error) { ... }`

**Pattern 2 — Throw errors (used by `conversions.service.ts`, `errorService`):**
```typescript
async function finalizeConversion() {
  const { data, error } = await supabase.from(...).rpc(...);
  if (error) throw new Error(`Failed to finalize: ${error.message}`);
  return data;
}
```
Callers wrap in `try/catch`.

The two patterns cannot be handled by a single error handler. Components calling conversion
functions must use `try/catch` while components calling inventory/session functions use `if (result.error)`.

This inconsistency matters most for cultivation because new session-to-harvest conversion
workflows will cross the boundary between the two patterns. A cultivation harvest function
that calls both `completeTrimSession()` (Pattern 1) AND `finalizeConversion()` (Pattern 2)
would need two different error handling strategies in the same function.

### What is the risk?

**Risk of doing nothing:** Medium. As cultivation adds more cross-service calls, error handling
becomes increasingly complex and fragile. A missed `try/catch` around a Pattern 2 call produces
an unhandled rejection that crashes the component.

**Risk of the fix:** Medium-High. Changing `conversions.service.ts` from Pattern 2 to Pattern 1
requires:
1. Changing all function signatures to return `{ data, error }` instead of throwing
2. Updating all callers (`useConversionWorkflow.ts`, `useFinalizationWorkflow.ts`, etc.) to
   check `result.error` instead of wrapping in try/catch

**This is a high-surface-area change.** Every `try/catch` in the conversion hooks must be
removed or rewritten. Missing one will cause the error to be swallowed silently.

### Recommendation: Do C3 AFTER C1

C3 is significantly safer if done AFTER C1's split. Once `conversions.service.ts` is split
into 4 focused files, each file can be migrated to Pattern 1 independently. Migrating one
file at a time (and running the build after each) keeps the change surface small and catchable.

**Migration order for C3:**
1. `conversions.analytics.ts` — read-only; lowest risk; migrate first
2. `conversions.variance.ts` — append-only writes; migrate second
3. `conversions.packages.ts` — complex writes; migrate third; carefully audit callers
4. `conversions.finalization.ts` — highest stakes (RPC calls); migrate last; test end-to-end

**Standard return interface to adopt:**
```typescript
interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}
```

### Safe execution steps

1. Complete C1 first. Do NOT start C3 before C1 is done and verified.

2. For each file in the migration order above:
   a. Change each `throw new Error(...)` to `return { data: null, error: new Error(...) }`
   b. Change each `return data` to `return { data, error: null }`
   c. Update the function return type annotation
   d. Run `npx tsc --noEmit` — this will surface every caller that needs updating
   e. Update each caller's error handling (remove `try/catch`, add `if (result.error)`)
   f. Run `npm run build` after each file

3. After all 4 files are migrated, run the full conversion finalization workflow manually to
   verify the UI still shows errors correctly.

### Do NOT

- Do NOT start C3 before C1 is complete
- Do NOT change Pattern 1 services to Pattern 2 — Pattern 1 is the target standard
- Do NOT use `tsc --noEmit` alone to verify caller updates — also manually trace each updated
  function back to its component to confirm the error is still surfaced to the user
- Do NOT change `errorService` itself — its internal throw pattern is intentional
  (it is a utility, not a service with external callers)

---

## Phase C Execution Order

```
Phase A complete → Phase C can start
C2 first         → Low-risk, isolated; wire retryOperation into recordMovement  [PENDING]
C1 second        → Split conversions.service.ts while it is clean; keep as barrel  [COMPLETE 2026-02-18]
C3 last          → Standardize error patterns; depends on C1's split for safety  [COMPLETE 2026-02-18]
```

### C1 Implementation Notes (2026-02-18)

Split into 5 files (not 4 as originally planned — analytics warranted its own module):
- `conversions.helpers.ts` — stage ID cache, `getProductStageIdFromProductName`, `getCategoryFromProductName`, `parseNetWeightFromProductName`
- `conversions.finalization.ts` — `getPendingConversions`, `finalizeConversion`, `voidConversion`
- `conversions.packages.ts` — package CRUD and ID generation
- `conversions.variance.ts` — variance logging, `getSessionContributions`
- `conversions.analytics.ts` — `getConversionSummary`, `getConversionHistory`

`conversions.service.ts` is now a thin barrel re-exporting all 5 modules. Zero changes to any consumer import paths.

The `stageIdCache` hazard was handled correctly — cache and all consumers live in `conversions.helpers.ts`.

### C3 Implementation Notes (2026-02-18)

All 5 conversions.* modules converted from throw-based errors to `{ data, error }` return pattern.

One exception preserved intentionally: `finalizeConversionPackages` retains `{ success, error }` shape (not `{ data, error }`) because its caller (`useConversionWorkflow`) checks `result.success`. This is correct behavior — do not change it.

A barrel collision was discovered and fixed: `varianceLog.service.ts` had exported `logVariance` as an alias for `createVarianceLog`. This conflicted with the new `logVariance` in `conversions.variance.ts` when both were re-exported from the services barrel. The alias was removed; `adjustment.service.ts` now imports `createVarianceLog` directly.

---

## Risk Summary Table

| Item | Existing Features at Risk | Risk Level | Rollback Difficulty | Status |
|------|--------------------------|------------|---------------------|--------|
| C1 | All conversion finalization flows | High | Medium: restore original conversions.service.ts | **COMPLETE** |
| C2 | Inventory movement recording | Low | Easy: remove retryOperation wrapper | Pending |
| C3 | All conversion hook callers | High | Hard: revert multiple files; test all callers | **COMPLETE** |

---

## Phase C Relationship to Cultivation

**C1 is a prerequisite for cultivation conversion work.** Adding cultivation conversion types
(harvest-to-trim, cultivation-to-inventory) into the existing 1,026-line file would be
architectural debt that becomes very hard to untangle later. Split the file before adding
cultivation-specific conversion functions.

**C3 is a quality-of-life prerequisite.** Without it, cultivation session-to-harvest conversion
functions will inherit the inconsistent error pattern and make the cultivation module harder
to reason about.

**C2 can wait until after cultivation if needed.** It is an improvement but not a prerequisite.
