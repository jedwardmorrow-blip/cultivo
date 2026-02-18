---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-17
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-18
**Session:** Phase A Type Hardening + Pre-Cultivation Documentation
**Status:** COMPLETE

**What was done:**
- Created all four Phase risk analysis docs (B, C, D) alongside previously created A; updated health assessment to reference all four
- **A4:** Recorded tsc baseline (501 errors); added `npm run typecheck` to both verification checklists
- **A1:** Removed duplicate `getVarianceSeverity` + `getVarianceColorClass` from `audit.types.ts`; canonical source is `conversions.types.ts`
- **A2:** Converted dynamic `await import('./locations.service')` in `routing.service.ts` to static import; eliminates mixed-module Vite warning
- **A3:** Replaced all 6 `any`-typed parameters in `sessions.service.ts` with DB-derived types (`TrimSessionInsert/Update`, `BuckingSessionInsert/Update`, `PackagingSessionInsert/Update`); removed `(s: any)` filter casts in `useTrimSessions.ts`

**Verification results:**
- `npm run build` passes clean
- `npm run typecheck`: **500 errors** (down 1 from baseline of 501)
- No migrations run

**Build status:** Passes clean

**Known issues:** 500 tsc errors (down from 501 baseline); pre-existing, not blocking

**New files:**
- `docs/SYSTEM-HEALTH-ASSESSMENT.md`
- `docs/CULTIVATION-PHASE-A-RISK-ANALYSIS.md`
- `docs/CULTIVATION-PHASE-B-RISK-ANALYSIS.md`
- `docs/CULTIVATION-PHASE-C-RISK-ANALYSIS.md`
- `docs/CULTIVATION-PHASE-D-RISK-ANALYSIS.md`

**Modified files:**
- `src/features/inventory/types/audit.types.ts` (removed 2 duplicate functions)
- `src/features/delivery/services/routing.service.ts` (static import for locations.service)
- `src/features/sessions/services/sessions.service.ts` (typed 6 `any` parameters)
- `src/features/sessions/hooks/useTrimSessions.ts` (removed 2 `(s: any)` casts)
- `docs/AI-SESSION-BRIEF.md` (typecheck in verification checklist; cultivation planning links)
- `docs/AI-BUILD-SESSION-CHECKLIST.md` (typecheck in end-of-session checklist; updated hand-off)

**Migrations:** None

**Critical context for future sessions:**
- All previous critical context still applies (getProductStageIdFromProductName async, stageIdCache, compliance constants, pdfjs singleton, lazy feature views)
- **Phase A is complete.** `audit.types.ts` no longer exports duplicate variance utilities; `sessions.service.ts` is fully typed; `routing.service.ts` uses static import for locations.service
- `sessions.service.ts` now uses `TrimSessionInsert/Update`, `BuckingSessionInsert/Update`, `PackagingSessionInsert/Update` — new cultivation session functions MUST follow the same pattern (use `Pick` or the generated `Insert`/`Update` types from `database.types.ts`)

**Next recommendations:**
- **Phase B** (pagination caps) — can be done in one session; read `CULTIVATION-PHASE-B-RISK-ANALYSIS.md` first; B1 → B2 → B3 order; B3 highest risk (run tsc --noEmit after each function)
- **Phase C** (service refactoring) — `conversions.service.ts` split; read `CULTIVATION-PHASE-C-RISK-ANALYSIS.md` first; C2 → C1 → C3 order; do NOT start C1 without reading about stageIdCache hazard
- **Phase D** (tests) — can start anytime; `inventoryMovement.service.ts` (D2) is highest value; read `CULTIVATION-PHASE-D-RISK-ANALYSIS.md` first
- **Cultivation scaffolding** — can begin now that Phase A is complete; schema design first (new tables, batch format extension); cultivation sessions MUST use same patterns as existing session types

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

**Cultivation Planning:**
- [SYSTEM-HEALTH-ASSESSMENT.md](./SYSTEM-HEALTH-ASSESSMENT.md) - Readiness scores and Phase A-D work plan
- [CULTIVATION-PHASE-A-RISK-ANALYSIS.md](./CULTIVATION-PHASE-A-RISK-ANALYSIS.md) - Risk analysis: duplicate exports, mixed imports, session typing, tsc checklist
- [CULTIVATION-PHASE-B-RISK-ANALYSIS.md](./CULTIVATION-PHASE-B-RISK-ANALYSIS.md) - Risk analysis: pagination caps, select('*') replacement, audit export path hazards
- [CULTIVATION-PHASE-C-RISK-ANALYSIS.md](./CULTIVATION-PHASE-C-RISK-ANALYSIS.md) - Risk analysis: conversions.service split, retryOperation, error pattern standardization
- [CULTIVATION-PHASE-D-RISK-ANALYSIS.md](./CULTIVATION-PHASE-D-RISK-ANALYSIS.md) - Risk analysis: test targets, test file locations, test writing rules

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
