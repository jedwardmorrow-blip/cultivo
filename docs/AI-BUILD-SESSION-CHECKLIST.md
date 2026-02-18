---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-18
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-18
**Session:** Pre-C-2 scaffolding — schema fix, navigation wiring, feature skeleton
**Status:** COMPLETE

**What was done:**
- Added `created_by` column to `batch_registry` (migration: `add_created_by_to_batch_registry`) with backfill from batch_production_history
- Fixed 4 errors in `CULTIVATION-ARCHITECTURE.md` harvest trigger spec: missing `strain` column, wrong `input_weight`/`created_by` column names, added COALESCE for null abbreviation safety
- Corrected navigation file reference in `CULTIVATION.md` (was `menuStructure.ts`, fixed to `sectionNavigation.ts`)
- Added `fn_populate_batch_registry_id` non-applicability note to architecture doc
- Wired Cultivation section into `sectionNavigation.ts` (3 views: Overview, Plant Groups, Harvest Sessions)
- Added 3 route cases in `App.tsx` with lazy imports
- Created `src/features/cultivation/` directory skeleton (components, hooks, services, types, barrel exports)
- Added Grow Rooms tab to Settings page
- Created interim TypeScript types in `src/features/cultivation/types/cultivation.types.ts`, re-exported from `src/types/index.ts`

**Build status:** Passes clean

**Known issues (carry-forward, unchanged):**
- 492 tsc errors — pre-existing, not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126
- `getProductStageIdFromProductName` error-path tests deferred (module-level cache issue)

**New files:**
- `src/features/cultivation/components/CultivationDashboard.tsx`
- `src/features/cultivation/components/PlantGroupsList.tsx`
- `src/features/cultivation/components/HarvestSessionsList.tsx`
- `src/features/cultivation/components/GrowRoomsManagement.tsx`
- `src/features/cultivation/components/index.ts`
- `src/features/cultivation/types/cultivation.types.ts`
- `src/features/cultivation/types/index.ts`
- `src/features/cultivation/hooks/index.ts`
- `src/features/cultivation/services/index.ts`
- `src/features/cultivation/index.ts`

**Modified files:**
- `src/shared/components/navigation/sectionNavigation.ts`
- `src/App.tsx`
- `src/features/settings/components/Settings.tsx`
- `src/types/index.ts`
- `docs/CULTIVATION-ARCHITECTURE.md`
- `docs/CULTIVATION.md`
- `docs/AI-BUILD-SESSION-CHECKLIST.md`
- `CHANGELOG.md`

**Migrations:** `add_created_by_to_batch_registry` — adds `created_by uuid` to batch_registry with backfill

**Critical context for next session (C-2: migrations):**
- Read `CULTIVATION.md`, `CULTIVATION-ARCHITECTURE.md`, and `CULTIVATION-RULES.md` BEFORE writing any SQL
- The `batch_registry.created_by` column now exists (added this session) — the harvest trigger can safely reference it
- The trigger spec in `CULTIVATION-ARCHITECTURE.md` has been corrected — use it as-is for C-2-2
- `strains.abbreviation` exists but is nullable — the trigger spec now includes COALESCE fallback
- Three migrations needed: C-2-1 (tables + RLS), C-2-2 (triggers), C-2-3 (optional seed data)
- Navigation and route cases are already wired — C-3 replaces placeholder components with real ones
- Interim types in `src/features/cultivation/types/cultivation.types.ts` should be regenerated from database.types.ts after C-2 runs

**Next recommendations:**
- **Session C-2** — Run the three cultivation migrations (tables, triggers, seed rooms). No UI work yet.
- **Session C-3** — Replace placeholder components with real Cultivation UI (the navigation shell is ready)
- **customers.service.test.ts fix** — still trivial, 1-liner when convenient

---

## Pre-Session Checklist

- [ ] Read [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)
- [ ] Read [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) if touching inventory/sessions
- [ ] Read [PRODUCTS.md](./PRODUCTS.md) if touching conversions
- [ ] Scan last 3-5 entries in [CHANGELOG.md](../CHANGELOG.md)
- [ ] Read the Hand-Off section above

---

## Current Session

**Date:** _(fill in)_
**Goal:** _(fill in)_
**Status:** _(Not Started / In Progress / Complete)_

### Work Items

| Item | Status | Files Changed | Notes |
|------|--------|---------------|-------|
| _(add items as you work)_ | | | |

### Issues Encountered

| Issue | Resolution |
|-------|------------|
| _(log problems here)_ | |

### Decisions Made

| Decision | Rationale |
|----------|-----------|
| _(log choices here)_ | |

---

## End-of-Session Checklist

- [ ] `npm run build` passes
- [ ] `npm run typecheck` run; error count documented (baseline: **501 errors** as of 2026-02-18)
- [ ] CHANGELOG.md updated (if significant changes)
- [ ] Hand-Off section updated with what was done, known issues, next steps
- [ ] Any new architectural decisions added to [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)

---

## Reference Links

**Start Here:**
- [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md) - System context and critical rules
- [DEVELOPER_QUICK_REFERENCE.md](./DEVELOPER_QUICK_REFERENCE.md) - Code patterns

**Architecture:**
- [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) - Key design decisions
- [PRODUCTS.md](./PRODUCTS.md) - Canonical product stages and conversions
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - End-to-end workflows
- [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) - Trigger system
- [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) - Phased optimization plan (type safety, bundle, cleanup)

**Cultivation Module (C-1 complete — docs locked):**
- [CULTIVATION.md](./CULTIVATION.md) - Scope, entities, lifecycle, UI screens (START HERE for C-2/C-3)
- [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md) - Full schema, RLS, triggers, migration plan
- [CULTIVATION-RULES.md](./CULTIVATION-RULES.md) - Invariants, decisions, error messages, test requirements

**Pre-Cultivation Preparation:**
- [SYSTEM-HEALTH-ASSESSMENT.md](./SYSTEM-HEALTH-ASSESSMENT.md) - Readiness scores and Phase A-D work plan
- [CULTIVATION-PHASE-A-RISK-ANALYSIS.md](./CULTIVATION-PHASE-A-RISK-ANALYSIS.md) - Phase A: type hardening (COMPLETE)
- [CULTIVATION-PHASE-B-RISK-ANALYSIS.md](./CULTIVATION-PHASE-B-RISK-ANALYSIS.md) - Phase B: pagination caps (COMPLETE)
- [CULTIVATION-PHASE-C-RISK-ANALYSIS.md](./CULTIVATION-PHASE-C-RISK-ANALYSIS.md) - Phase C: service refactoring (COMPLETE)
- [CULTIVATION-PHASE-D-RISK-ANALYSIS.md](./CULTIVATION-PHASE-D-RISK-ANALYSIS.md) - Phase D: testing (244 tests, 177/178 passing)

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
