---
title: System Health Assessment — Pre-Cultivation Module
category: Planning & Architecture
updated: 2026-02-18 (Phase C complete)
priority: Read before starting cultivation module work
---

# System Health Assessment — Pre-Cultivation Module

> **Purpose:** Honest baseline assessment of the system before adding the cultivation module.
> Covers architecture, type safety, compliance readiness, performance, and testing.
> Scored on a 10-point scale. Use this document to prioritize pre-cultivation work.
>
> **When to re-run this assessment:** After each major module addition, or when the roadmap
> needs to be re-prioritized.

---

## Executive Summary

**Overall Score: 8.1 / 10**

The system is production-ready with a clean, well-documented architecture. All 5 optimization phases
(Phases 1-5 from `OPTIMIZATION-ROADMAP.md`) are complete, as are pre-cultivation phases A, B, and C.
The primary remaining risk before cultivation is:

1. No tests on any critical business logic paths (score: 3/10) — **Phase D is the only remaining pre-cultivation work item**

---

## Dimension Scores

| # | Dimension | Score | Key Risk |
|---|-----------|-------|----------|
| 1 | Architecture & Code Structure | 8.5 | Duplicate variance utility exports |
| 2 | Type Safety | 7.5 | 58 files with `: any`; session service untyped |
| 3 | State Management & Data Flow | 8.0 | No global state for cross-feature data |
| 4 | Service Layer & Business Logic | 9.5 | `conversions.service.ts` split into 5 focused modules; error patterns standardized |
| 5 | Database & Supabase Patterns | 8.0 | Pagination nearly absent |
| 6 | Compliance & Audit Trail | 9.0 | No compliance officer dashboard |
| 7 | Performance | 8.5 | Bundle optimized; pagination not done |
| 8 | Error Handling & Resilience | 8.5 | Error return pattern standardized (conversions); `retryOperation` still not wired (C2 pending) |
| 9 | Testing Coverage | 3.0 | Zero coverage of critical paths |
| 10 | Documentation | 9.5 | Best-in-class; minor diagram gaps |

---

## Detailed Findings

### 1. Architecture & Code Structure — 8.5/10

**Strengths:**
- Feature module pattern (`features/[module]/components|services|hooks|types`) is consistently applied across all 14 modules
- Barrel exports are uniform; path aliases (`@/types`, `@/services`, `@/features`) keep imports clean
- Business logic lives in services, not components — the pattern is respected throughout

**Weaknesses:**
- `getVarianceColorClass` and `getVarianceSeverity` are exported from BOTH `inventory/types/audit.types.ts` and `inventory/types/conversions.types.ts`. The `src/types/index.ts` barrel re-exports from `conversions.types.ts` only, but the audit version is still importable from the module path. Any future AI session adding imports could unknowingly pull the wrong version. Both functions have identical logic today — but a divergence would be silent.
- `locations.service.ts` is statically imported by `ManifestModal.tsx` and `manifestService.ts` but also dynamically imported by `routing.service.ts`. This produces a Vite build warning and can result in the module being bundled twice in edge cases.
- No circular dependency prevention tooling (eslint-plugin-import or madge). None detected currently, but cultivation will add many cross-module references.

**Recommendation:** Resolve the duplicate variance utility exports before cultivation. Pick one source (recommend `conversions.types.ts` since it is already re-exported from `@/types`) and remove the duplicate from `audit.types.ts`. See Phase A Risk Analysis doc for detailed safe steps.

---

### 2. Type Safety — 7.5/10

**Strengths:**
- `database.types.ts` is generated from live schema (6,599 lines, 76 tables, 85 FK relationships) — not hand-written
- Centralized canonical types in `src/types/` are followed; Phase 3 eliminated all 6 shadow type conflicts
- `tsc --noEmit` currently shows ~500 pre-existing errors (non-blocking baseline, no regressions from Phase 5)

**Weaknesses:**
- 58 files contain `: any` annotations; 21 files contain `as any` casts
- `sessions.service.ts` uses `any` for all session creation and completion parameters (`createTrimSession(sessionData: any)`, `completeTrimSession(sessionId, completionData: any)`, etc.) — 8 instances across 3 session types
- `useTrimSessions.ts` casts Supabase results with `(s: any)` in filter callbacks, bypassing the inferred type from the database
- `database.types.ts` is the source of truth but `tsc --noEmit` is not run in CI — type regressions are invisible

**Recommendation:** Type the session service input parameters as interfaces derived from the generated DB types. This is the highest-value typing work before cultivation because the cultivation module will add new session types (grow sessions, harvest sessions). See Phase A Risk Analysis for the precise interfaces needed.

---

### 3. State Management & Data Flow — 8.0/10

**Strengths:**
- Context + custom hooks pattern is clean and consistent across all features
- Real-time Supabase subscriptions are debounced and properly cleaned up (verified in `useTableSubscription.ts`)
- 163 useMemo/useCallback usages show active attention to render optimization

**Weaknesses:**
- No global state library — cross-feature state relies on prop-passing or re-fetching. Cultivation will need to share grow room state across inventory, sessions, and batch views.
- Orders context loads all orders on mount with no limit; sessions hooks load all historical sessions on mount
- Cache invalidation is purely reactive (subscription-driven) — no optimistic updates or manual cache control

**Recommendation:** Evaluate a lightweight global state approach (Zustand or React Context at app level) for cultivation before building. The existing per-feature context pattern will not scale well to grow-room-aware inventory views.

---

### 4. Service Layer & Business Logic — 9.0/10

**Strengths:**
- `inventoryMovementService.recordMovement()` is the single entry point for all inventory changes — consistently honored. No direct quantity updates found in any service.
- `errorService` provides centralized categorization (7 error types) with `retryOperation` and exponential backoff
- Single responsibility is generally followed — services are focused with clear scopes

**Weaknesses:**
- `retryOperation` is available in `errorService` but not wired into any service call — all operations are single-attempt (C2 pending)
- 42 TODO/FIXME comments across 9 files indicate acknowledged-but-deferred work

**Resolved (2026-02-18):**
- `conversions.service.ts` split into 5 focused modules (`conversions.helpers`, `.finalization`, `.packages`, `.variance`, `.analytics`) — original filename kept as thin barrel re-export
- Error handling pattern standardized: all conversions.* modules now return `{ data, error }` matching inventory/session service patterns

---

### 5. Database & Supabase Patterns — 8.0/10

**Strengths:**
- 306 migration files — schema history is thorough and well-tracked
- RPCs handle complex operations correctly (`finalize_session_aggregated`, `void_session_aggregated`, `generate_next_package_id`)
- Database triggers enforce ATP constraints and inventory balance updates automatically (see `DATABASE-TRIGGERS.md`)

**Weaknesses:**
- Only 13 instances of `.limit()` or `.range()` across all features — pagination is nearly absent
- Most list queries use `.select('*')` — all columns fetched even for list-view display
- Supabase error handling is inconsistent: some services check `.code`, others check truthy `error`, some log both
- RLS policies are not referenced or documented in application code

**Recommendation:** Add `.limit(100)` as a defensive default on all list queries before cultivation. Plant tracking tables will grow to thousands of rows quickly. Cursor-based pagination should follow for orders and inventory before the scale inflection point.

---

### 6. Compliance & Audit Trail — 9.0/10

**Strengths:**
- Immutable inventory ledger via `inventory_movements` table with trigger-enforced balance updates (Architecture Decision #3)
- Batch ID format (`YYMMDD-STRAIN`) is never null in operations — consistently enforced (Architecture Decision #2)
- COA bidirectional sync, variance logging with required reasons, session cancellation timestamps all implemented
- ATP constraint enforced at the database trigger level (Architecture Decision #5)

**Weaknesses:**
- The `session_finalization` reason code bypasses movement trigger — intentional per Architecture Decision #1, but creates a gap if misapplied
- No compliance audit dashboard UI where an AZDHS auditor can review movements, variances, and cancellations by date range
- Package ID generation is sequential and RPC-based — race condition risk under concurrent finalization (low risk at current scale, higher risk at cultivation scale)

**Recommendation:** Build the compliance audit dashboard as part of the cultivation module release. It reuses existing `inventory_movements` and `conversion_variance_log` data — no new tables needed. This is a regulatory necessity for AZDHS audits.

---

### 7. Performance — 8.5/10

**Strengths:**
- Main bundle reduced 87% (2,487 KB to 331 KB) — Phase 5 optimization is complete
- All 21 feature views are lazy-loaded; heavy deps (PDF, maps) deferred to 149-445 KB chunks
- Vendor chunks are split for optimal browser caching

**Weaknesses:**
- Pagination is nearly absent — full datasets load into memory for orders, sessions, and inventory
- Most list queries use `select('*')` — over-fetching on every mount
- No query performance instrumentation (no slow query logging or timing)

**Recommendation:** Implement `.limit(100)` + offset pagination on inventory and sessions lists before cultivation. Plant tracking at scale (hundreds of plants per cycle) will make current full-load patterns unacceptable.

---

### 8. Error Handling & Resilience — 8.0/10

**Strengths:**
- Global `ErrorBoundary` with auto-recovery (3 attempts, 10s cooldown)
- `retryOperation` with exponential backoff exists in `errorService`
- Feature-level `OrdersErrorBoundary` shows granular error isolation is already proven out

**Weaknesses:**
- `retryOperation` is not used in any service call — available but unadopted (Phase C2 pending)
- No offline detection — network failures surface as errors after the fact, not proactive warnings
- Some service error messages are generic (`'Failed to create trim session'`) without including the session type or identifier

**Resolved (2026-02-18):** All `conversions.*` modules now return `{ data, error }` — the two-pattern inconsistency that required separate error handling strategies is eliminated.

**Recommendation:** Wire `retryOperation` into at minimum the inventory movement service calls (Phase C2). These are the highest-stakes write operations and the ones most affected by transient Supabase network issues.

---

### 9. Testing Coverage — 3.0/10

**Strengths:**
- Vitest is configured and working with UI mode
- Test infrastructure exists: fixtures in `src/__tests__/fixtures/`, helpers, Supabase mock
- 5 unit tests cover `errorService`, `notificationService`, `customersService`, `utils`, and `productNaming`

**Weaknesses:**
- Zero tests for critical paths: session finalization, inventory movement recording, conversion finalization, order fulfillment
- 5 test files for ~45 service files = under 10% coverage of the service layer
- No integration tests and no E2E tests — the riskiest flows are completely untested
- `sessions.service.ts` is the backbone of the cultivation module and has no tests whatsoever

**Recommendation:** Write integration tests for session completion (trim, bucking, packaging) and inventory movement recording before cultivation adds new session types. These are the highest-risk paths in the system. A broken session completion can corrupt inventory records in ways that are difficult to reverse.

---

### 10. Documentation — 9.5/10

**Strengths:**
- 36 documentation files covering every major module with clear rules and rationale
- AI session brief, architecture decisions, and optimization roadmap are all current as of 2026-02-18
- JSDoc with usage examples on key services; inline documentation is consistent

**Weaknesses:**
- No visual diagrams — all workflow documentation is text-based (acceptable, but diagrams would accelerate onboarding)
- Some cross-references between docs could drift as cultivation adds new modules
- `MODULE-STATUS.md` last updated 2026-02-11 — pre-dates the last few sessions

**Recommendation:** Update `MODULE-STATUS.md` when cultivation module is added. Add a cultivation entry to `SYSTEM-WORKFLOW.md` showing the harvest-to-shelf lifecycle.

---

## Pre-Cultivation Work Prioritization

Work items are ordered by risk to existing features and value to cultivation readiness.

### Phase A — Type Hardening (Recommended Before Cultivation)

These are low-behavioral-risk fixes that make the codebase safer for future AI sessions to extend.
See `docs/CULTIVATION-PHASE-A-RISK-ANALYSIS.md` for detailed risk assessment of each item.

| Item | Risk | Impact |
|------|------|--------|
| A1: Remove duplicate variance utility exports from `audit.types.ts` | Low | Prevents future import confusion |
| A2: Fix `locations.service` mixed import build warning | Low | Eliminates bundle duplication risk |
| A3: Type `sessions.service.ts` input parameters | Medium | Prevents silent data corruption in new session types |
| A4: Add `tsc --noEmit` to pre-build check | Low | Makes type regressions visible |

### Phase B — Pagination (Recommended Before Cultivation Launch)

See `docs/CULTIVATION-PHASE-B-RISK-ANALYSIS.md` for query-level analysis, the right limit values, and risks around audit export paths.

| Item | Risk | Impact |
|------|------|--------|
| B1: Add `.limit(100)` default to inventory list queries | Low | Prevents load degradation with plant inventory |
| B2: Add `.limit(100)` default to sessions history queries | Low | Prevents load degradation with grow sessions |
| B3: Switch list views from `select('*')` to explicit columns | Low-Medium | Reduces data transfer significantly |

### Phase C — Service Refactoring (COMPLETE except C2)

See `docs/CULTIVATION-PHASE-C-RISK-ANALYSIS.md` for implementation details.

| Item | Status | Risk | Impact |
|------|--------|------|--------|
| C1: Split `conversions.service.ts` into 5 focused modules | **COMPLETE** (2026-02-18) | High | Done; barrel re-export preserved |
| C2: Wire `retryOperation` into inventory movement service | **PENDING** | Low | Can be done at any time; not a cultivation blocker |
| C3: Standardize error return pattern across all services | **COMPLETE** (2026-02-18) | High | All conversions.* modules now use `{ data, error }` |

### Phase D — Testing (High Value, Can Start Anytime)

See `docs/CULTIVATION-PHASE-D-RISK-ANALYSIS.md` for exact functions to test, test file locations, and test writing rules for this codebase.

| Item | Risk | Impact |
|------|------|--------|
| D1: Session completion tests (all 3 types) | None | Baseline regression coverage before adding cultivation session types |
| D2: Unit tests for `inventoryMovement.service.ts` | None | Highest-risk service, zero coverage |
| D3: Pure function tests for conversion finalization | None | Covers the most frequently broken business logic path |
| D4: Order status transition tests | None | Guards against silent status machine regressions |
| D5: Batch allocation and ATP tests | None | Guards against strain-matching and availability bugs |

---

## Cultivation Module Readiness Statement

The system is ready to begin **cultivation module scaffolding** (schema design, route setup, type definitions) immediately. The Phase A fixes can be done in a single focused session without risk to production workflows. Phase B and C should be completed before the cultivation module's first production use.

The most important rule for cultivation work: **cultivation sessions (grow sessions, harvest sessions) must follow the exact same patterns as existing session types in `sessions.service.ts`**. The batch-centric architecture, immutable inventory ledger, and ATP constraint all apply to cultivation inventory just as they do to post-production inventory.

See also:
- `docs/ARCHITECTURE-DECISIONS.md` — all decisions apply to cultivation
- `docs/SESSIONS.md` — cultivation sessions should mirror this pattern
- `docs/INVENTORY-TRACKING.md` — cultivation inventory uses the same ledger
- `docs/OPTIMIZATION-ROADMAP.md` — Phases 1-5 are complete; this document extends the roadmap
