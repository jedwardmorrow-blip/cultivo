---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-19
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-19
**Session:** D-4 — Cultivation Module Testing + customers.service Fix
**Status:** COMPLETE

**What was done:**
- Fixed pre-existing `customers.service.test.ts` failure: `zip` → `postal_code` in `createCustomer` assertion (line ~126)
- Created 4 new cultivation test files covering all 28 scenarios from CULTIVATION-RULES.md:
  - `cultivation.service.grow-rooms.test.ts` — grow room CRUD, dry room CRUD, room_code/dry_room_code uniqueness (Scenarios 8, 23)
  - `cultivation.service.plant-groups.test.ts` — plant group lifecycle, stage filtering, backward transition guard (Scenarios 1, 2, 7, 9, 11, 12, 13, 16)
  - `cultivation.service.harvest-sessions.test.ts` — create/complete/cancel/adjust, batch creation trigger, same-day batch linking, cancellation guard (Scenarios 3, 4, 5, 6, 10, 14, 15)
  - `cultivation.service.binning-sessions.test.ts` — create/complete/cancel, non-completed harvest guard, duplicate guard, batch mismatch guard, zero weight guard (Scenarios 17–24)
- Test count: **114 → 308** (+194 tests, 14 test files all passing)

**Build status:** PASSES — ✓ built in 45.33s, 308/308 tests pass

**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- Type regeneration still pending (run `npm run types:generate` when convenient)

**Modified files (this session):**
- `src/__tests__/unit/features/customers/customers.service.test.ts` — fixed zip→postal_code
- `src/__tests__/unit/features/cultivation/cultivation.service.grow-rooms.test.ts` — NEW
- `src/__tests__/unit/features/cultivation/cultivation.service.plant-groups.test.ts` — NEW
- `src/__tests__/unit/features/cultivation/cultivation.service.harvest-sessions.test.ts` — NEW
- `src/__tests__/unit/features/cultivation/cultivation.service.binning-sessions.test.ts` — NEW
- `CHANGELOG.md`

**Next recommendations (in order):**
1. **Type regeneration** — run `npm run types:generate` to sync database.types.ts with live schema (includes all 9 cultivation tables)
2. **Cultivation UI polish** — any remaining C-3 UI items identified during D-2/D-3
3. **Integration tests** — if live DB testing infrastructure is added in future, cultivation trigger behavior (stage machine, batch creation, binning validation) is the highest-value target

---

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
