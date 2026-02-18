---
title: Cultivation Pre-Work — Phase A Risk Analysis
category: Planning & Architecture
updated: 2026-02-18
priority: Read before executing Phase A type hardening work
---

# Cultivation Pre-Work — Phase A Risk Analysis

> **Purpose:** Detailed risk analysis for each Phase A (Type Hardening) item identified in
> `docs/SYSTEM-HEALTH-ASSESSMENT.md`. Answers: What exactly needs changing? What could break?
> What is the safe order of operations?
>
> **Read this document when:** An AI session is about to start Phase A work. Each item has an
> explicit "Do NOT" section that must be followed.

---

## Phase A Overview

Phase A addresses 4 issues in the existing codebase. None involve runtime logic changes — they
are structural fixes to type definitions, export patterns, and a build configuration. However,
because this codebase has no test coverage on critical paths, every change carries some residual
risk from human error or incorrect refactoring.

| Item | File(s) | Risk Level | Behavior Change? |
|------|---------|------------|-----------------|
| A1 | `inventory/types/audit.types.ts` | Low | No |
| A2 | `delivery/services/routing.service.ts` | Low | No |
| A3 | `sessions/services/sessions.service.ts` | Medium | No (types only) |
| A4 | `package.json` / build config | Low | No |

**Critical constraint for all items:** The build must pass after each individual item is
completed. Do not batch all 4 items into one session without intermediate build checks.

---

## A1: Remove Duplicate Variance Utility Exports

### What is the issue?

`getVarianceSeverity` and `getVarianceColorClass` are exported from two files:

| File | Export |
|------|--------|
| `src/features/inventory/types/conversions.types.ts` | ✓ Canonical — re-exported from `@/types` |
| `src/features/inventory/types/audit.types.ts` | Duplicate — same logic, different return type signature |

The `src/types/index.ts` barrel re-exports from `conversions.types.ts` only:
```typescript
export * from '../features/inventory/types/conversions.types';
```

The `audit.types.ts` version is NOT in the barrel, but it is importable directly from the module
path. Any file that imports from `@/features/inventory/types/audit.types` instead of `@/types`
will get the `audit.types` version.

Currently, only `VarianceConfirmation.tsx` uses these functions, and it imports from `@/types`
(the correct canonical source). No files import these functions from `audit.types.ts` directly.

### What is the risk?

**Risk of doing nothing:** Low today, but increases as cultivation adds more variance-handling
code. A future AI session adding a new variance component might import from `audit.types.ts` via
path autocomplete, getting the non-canonical version. The return type of `getVarianceSeverity`
in `audit.types.ts` is `'low' | 'medium' | 'high' | 'critical'` (inline union) while
`conversions.types.ts` uses the named `VarianceSeverity` type. This would cause a subtle type
mismatch that `tsc` would catch but the build would not.

**Risk of the fix:** Very low. The fix is to delete 2 functions from `audit.types.ts`. Since no
file imports them from that path, no consumer will break. The functions in `conversions.types.ts`
remain unchanged and are still the canonical source.

**One real danger:** If a future session adds `export * from '../features/inventory/types/audit.types'`
to `src/types/index.ts` without reading this document, both versions would be re-exported and
TypeScript would raise a duplicate identifier error. The fix in A1 prevents this entirely.

### Safe execution steps

1. Search for any imports of `getVarianceSeverity` or `getVarianceColorClass` from `audit.types` specifically:
   ```bash
   grep -rn "from.*audit.types" src/ | grep -E "getVariance"
   ```
   Expected result: zero matches. If any match exists, update those imports to `@/types` first.

2. Delete the two duplicate functions (`getVarianceSeverity`, `getVarianceColorClass`) from
   `src/features/inventory/types/audit.types.ts`. Do NOT delete `requiresVarianceReason` — that
   function exists only in `audit.types.ts` and is not duplicated.

3. Run `npm run build`. It must pass.

4. Run `grep -n "getVarianceSeverity\|getVarianceColorClass" src/features/inventory/types/audit.types.ts`.
   Expected result: zero matches.

### Do NOT

- Do NOT delete `audit.types.ts` — it contains many other types and functions that are used
- Do NOT move `requiresVarianceReason` — it is not a duplicate; leave it in `audit.types.ts`
- Do NOT change the canonical versions in `conversions.types.ts`
- Do NOT add `audit.types.ts` to the `src/types/index.ts` barrel

---

## A2: Fix locations.service Mixed Import Warning

### What is the issue?

`locations.service.ts` is imported in two different ways across the codebase:

| File | Import type |
|------|------------|
| `src/features/orders/components/ManifestModal.tsx` | Static: `import { getAllLocations, Location } from '../../delivery/services/locations.service'` |
| `src/features/orders/services/manifestService.ts` | Static: `import { getLocationById } from '../../delivery/services/locations.service'` |
| `src/features/delivery/services/routing.service.ts` | Dynamic: `const { getLocationById } = await import('./locations.service')` |
| `src/features/delivery/services/index.ts` | Static barrel re-export |

The dynamic import in `routing.service.ts` was added as part of Phase 5 bundle optimization to
defer the delivery module. However, `locations.service.ts` is also statically imported by
`ManifestModal.tsx` (in the orders feature) and `manifestService.ts`. This means the module
ends up in the initial bundle anyway via the static imports, while `routing.service.ts` also
asynchronously requests it. Vite may bundle it twice in some configurations.

### What is the risk?

**Risk of doing nothing:** Low. The build passes. The behavior is correct — `getLocationById`
works in both the static and dynamic import contexts. The practical risk is a small redundant
bundle contribution and a Vite warning, not a runtime failure.

**Risk of the fix:** Very low. The fix is to change the dynamic import in `routing.service.ts`
back to a static import, since the module is already in the bundle via the orders-feature static
imports. This removes the Vite warning without any behavior change.

**One subtlety:** `routing.service.ts` is itself lazy-loaded as part of the delivery feature.
If `locations.service.ts` were NOT statically imported by the orders feature, converting it back
to a static import in `routing.service.ts` would be correct anyway — the delivery chunk would
pull in `locations.service` as part of its own bundle. Since orders already statically imports it,
it will land in a shared chunk regardless.

### Safe execution steps

1. In `src/features/delivery/services/routing.service.ts`, find the dynamic import:
   ```typescript
   const { getLocationById } = await import('./locations.service');
   ```
   Replace it with a static import at the top of the file:
   ```typescript
   import { getLocationById } from './locations.service';
   ```
   Then remove the dynamic import line from inside the function body.

2. Run `npm run build`. The Vite warning about mixed imports should be gone. Build must pass.

3. Verify `stats.html` (bundle visualizer) shows `locations.service` in a single chunk, not
   duplicated across chunks.

### Do NOT

- Do NOT change the import in `ManifestModal.tsx` or `manifestService.ts` — those are correct static imports
- Do NOT make `locations.service` itself dynamic-only — it would break the orders manifest feature
- Do NOT touch any other delivery services as part of this fix

---

## A3: Type sessions.service.ts Input Parameters

### What is the issue?

`sessions.service.ts` uses `any` for all session creation and completion parameters:

```typescript
export async function createTrimSession(sessionData: any)
export async function completeTrimSession(sessionId: string, completionData: any)
export async function createBuckingSession(sessionData: any)
export async function completeBuckingSession(sessionId: string, completionData: any)
export async function createPackagingSession(sessionData: any)
export async function completePackagingSession(sessionId: string, completionData: any)
```

These `any` parameters are spread directly into Supabase `.insert()` and `.update()` calls:
```typescript
const { data, error } = await supabase
  .from('trim_sessions')
  .insert(sessionData)   // <-- sessionData is any
```

This means TypeScript will not catch if a caller passes a misspelled field, a field of the
wrong type, or misses a required field. The database will silently reject or ignore the extra
fields, or insert null where a value was expected.

### What is the risk?

**Risk of doing nothing:** Medium. Today the callers (the complete modal components) pass
well-known fields verified by the UI. The risk is low for existing callers. The risk increases
significantly when cultivation adds new session types (grow sessions, harvest sessions) — a
future AI session will model new session creation after this service and propagate the `any`
pattern into cultivation-specific session functions.

**Risk of the fix:** Medium — this is the highest-risk item in Phase A. The reason is:

1. The correct types for `sessionData` and `completionData` must be derived from `database.types.ts`
   (the generated schema). If the interface is defined incorrectly, it may be TOO restrictive
   (blocking valid fields) or TOO permissive (missing required fields). The build will not catch
   this — only `tsc --noEmit` will.

2. The callers (`TrimSessionCompleteModal`, `BuckingSessionCompleteModal`, etc.) construct the
   `completionData` object inline with spread syntax:
   ```typescript
   const { error } = await completeTrimSession(session.id, {
     ...formData,
     bucked_smalls_inventory_id: formData.bucked_smalls_inventory_id || null,
     session_status: 'completed'
   });
   ```
   Once `completionData` is typed, these spreads must be compatible. If `formData`'s type does
   not match the new interface, TypeScript will report an error that needs to be resolved.

3. There are 3 session types (trim, bucking, packaging), each with different completion fields.
   The interfaces must be session-type-specific.

### Precise interfaces needed

Based on the database schema and actual caller code, the required interfaces are:

**Trim Session:**
```typescript
// Create
interface TrimSessionInsert {
  strain: string;
  strain_id?: string;
  batch_id?: string;
  batch_registry_id?: string;
  trimmer_name: string;
  session_date: string;
  pulled_weight: number;
  notes?: string;
  started_at?: string;
}

// Complete (update)
interface TrimSessionComplete {
  big_buds_grams: number;
  small_buds_grams: number;
  trim_grams: number;
  waste_grams: number;
  bucked_smalls_grams?: number;
  bucked_smalls_inventory_id?: string | null;
  notes?: string;
  session_status: 'completed';
}
```

**Bucking Session:**
```typescript
interface BuckingSessionInsert {
  strain: string;
  strain_id?: string;
  batch_id?: string;
  batch_registry_id?: string;
  operator_name: string;
  session_date: string;
  pulled_weight: number;
  notes?: string;
  started_at?: string;
}

interface BuckingSessionComplete {
  flower_grams: number;
  smalls_grams: number;
  waste_grams?: number;
  notes?: string;
  session_status: 'completed';
}
```

**Packaging Session:**
```typescript
interface PackagingSessionInsert {
  strain: string;
  strain_id?: string;
  batch_id?: string;
  batch_registry_id?: string;
  operator_name: string;
  session_date: string;
  source_inventory_id?: string;
  notes?: string;
  started_at?: string;
}

interface PackagingSessionComplete {
  total_units_packaged?: number;
  units_3_5g?: number;
  units_14g?: number;
  units_1lb?: number;
  waste_grams?: number;
  notes?: string;
  session_status: 'completed';
}
```

**Important:** Validate these interfaces against `database.types.ts` before using them. The
generated types contain the authoritative column list. The interfaces above should be defined
as `Pick` or `Partial` derivatives of the generated row types, not hand-written from scratch.

### Safe execution steps

1. Run `grep -n "Tables\[.trim_sessions.\]" src/lib/database/database.types.ts` to find the
   generated `Insert` and `Update` types for trim sessions. Use these as the source of truth.

2. In `src/features/sessions/types/index.ts`, define the input interfaces using `Pick` from the
   generated types rather than hand-writing them. Example:
   ```typescript
   import type { Database } from '@/lib/database/database.types';
   type TrimSessionRow = Database['public']['Tables']['trim_sessions']['Insert'];
   export type TrimSessionInsert = Pick<TrimSessionRow, 'strain' | 'trimmer_name' | ...>;
   ```

3. Replace `any` in `sessions.service.ts` with the proper interfaces.

4. Run `npm run build`. If the build fails, the callers need their inline objects updated to
   match the new types. Fix each caller before moving on.

5. Run `npx tsc --noEmit` and record the new error count. It should be equal to or lower than
   the pre-fix baseline of ~500 errors.

6. Check all 6 completion modal components pass build:
   - `TrimSessionCompleteModal.tsx`
   - `TrimSessionCancelModal.tsx`
   - `BuckingSessionCompleteModal.tsx`
   - `BuckingSessionCancelModal.tsx`
   - `PackagingSessionCompleteModal.tsx`
   - `PackagingSessionCancelModal.tsx`

### Do NOT

- Do NOT hand-write interface field lists without first checking `database.types.ts` — field
  names differ from what you might guess (e.g., `big_buds_grams` not `flower_grams` for trim)
- Do NOT use `Partial<GeneratedRow>` as the type — it makes all fields optional and defeats
  the purpose; use `Pick` with the specific required fields
- Do NOT change the function signatures (parameter names, return types) — only replace `any`
  with the specific interfaces
- Do NOT touch the function bodies — the Supabase calls remain unchanged
- Do NOT type the `error` in JSDoc `@returns` comments — those are documentation-only and are
  fine as `any` in comments
- Do NOT add new optional parameters or change call sites beyond what TypeScript forces

---

## A4: Add tsc --noEmit to Pre-Build Verification

### What is the issue?

Vite uses `esbuild` for transpilation. `esbuild` does NOT type-check. A build can pass with
hundreds of TypeScript errors. The `npm run typecheck` script exists (`tsc --noEmit -p tsconfig.app.json`)
but is not part of the standard pre-build workflow described in `AI-SESSION-BRIEF.md`.

The current verification checklist says:
```
- [ ] `npm run build` passes
```

It does not say to run `npm run typecheck`. This means type regressions introduced by AI sessions
are invisible until they cause a runtime error.

### What is the risk?

**Risk of doing nothing:** Low in the short term. The current ~500 tsc errors are pre-existing and
known. The risk is that A3 (typing sessions.service.ts) introduces new tsc errors silently if the
session is not careful. More importantly, cultivation will add many new service files and if
typecheck is not part of the workflow, type discipline will erode quickly.

**Risk of the fix:** Very low. This is a documentation change only — updating the verification
checklist in `AI-SESSION-BRIEF.md` and `AI-BUILD-SESSION-CHECKLIST.md` to include `npm run typecheck`.

**One important nuance:** The current baseline is ~500 tsc errors. Adding `typecheck` to the
checklist must be paired with documenting the baseline error count so AI sessions can tell
whether they introduced new errors vs. seeing pre-existing ones. The goal is not zero errors
immediately — it is to detect regressions.

### Safe execution steps

1. Record the current tsc error count before starting any Phase A work:
   ```bash
   npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -1
   ```
   Document this number in `AI-BUILD-SESSION-CHECKLIST.md` as the baseline.

2. In `docs/AI-SESSION-BRIEF.md`, update the Verification Checklist section to add:
   ```
   - [ ] `npm run typecheck` run; error count not higher than session-start baseline
   ```

3. In `docs/AI-BUILD-SESSION-CHECKLIST.md`, update the End-of-Session Checklist to add:
   ```
   - [ ] `npm run typecheck` error count documented (compare to session-start baseline)
   ```

4. In `docs/OPTIMIZATION-ROADMAP.md`, add a new row to the Completion Log noting the tsc
   baseline at the start of cultivation pre-work.

### Do NOT

- Do NOT require zero tsc errors as a gate — the pre-existing ~500 errors are non-blocking
- Do NOT attempt to fix all pre-existing tsc errors in this phase
- Do NOT change the `tsconfig.app.json` settings — only use the existing typecheck script

---

## Phase A Execution Order

Execute items in this order. Each item must fully pass (`npm run build`) before starting the next.

```
A4 first  → Documents baseline tsc count; no code changes; lowest risk
A1 second → Removes 2 functions from 1 file; build confirms no consumers break
A2 third  → Changes 1 import in routing.service.ts; build confirms no warning
A3 last   → Highest-risk item; do after A1 and A2 are confirmed clean
```

**Rationale for A4 first:** Before touching any code, capture the tsc error baseline. This makes
it possible to verify that A3 (the medium-risk item) did not introduce new type errors.

---

## Risk Summary Table

| Item | Existing Features at Risk | Risk Level | Rollback Difficulty |
|------|--------------------------|------------|---------------------|
| A1 | `VarianceConfirmation.tsx` (uses canonical, not duplicate — no risk) | Low | Trivial: re-add the 2 functions |
| A2 | Delivery routing, order manifests | Low | Trivial: revert the static import |
| A3 | All 6 session complete/cancel modals | Medium | Easy: revert `sessions.service.ts` types to `any` |
| A4 | None (docs only) | Low | Trivial: revert doc changes |

**No Phase A item has a high rollback difficulty.** If any item causes a build failure, revert
the change to `any` or restore the deleted code and document the blocker in the session checklist.

---

## What Phase A Does NOT Fix

Phase A is scoped to type hardening only. The following gaps identified in
`SYSTEM-HEALTH-ASSESSMENT.md` are explicitly deferred:

- Pagination (Phase B) — separate work, different risk profile
- `conversions.service.ts` split (Phase C) — higher risk, requires its own risk analysis
- Test coverage (Phase D) — additive work, no regression risk, can run in parallel
- The `useTrimSessions.ts` `(s: any)` filter casts — minor issue; fix inline when session types are updated in A3
- The JSDoc `@returns` comments that say `error: any` — documentation only, not a code issue
