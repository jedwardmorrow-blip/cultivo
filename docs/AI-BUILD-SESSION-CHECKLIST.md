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

**Date:** 2026-02-20
**Session:** D-9 — Remove group_number, Batch Number as Sole Identifier
**Status:** COMPLETE

**What was done:**

Removed `group_number` from `plant_groups` entirely across the codebase. The batch number from `batch_registry` (format `YYMMDD-ABBREV`, e.g. `260218-OGK`) is now the sole human-readable identifier for plant groups throughout the cultivation UI.

Key changes:
- `cultivation.types.ts` — removed `group_number` from `PlantGroup`; updated `mother_group` join type to include `batch_registry`; removed `group_number` from `HarvestSession.plant_groups` and `BinningSession.harvest_sessions.plant_groups`
- `cultivation.service.ts` — removed `group_number` from `PLANT_GROUP_SELECT`, `HARVEST_SESSION_SELECT`, all 4 binning session inline selects; removed `group_number: 'PENDING'` from `createPlantGroup` insert; changed `listMotherGroups` ordering from `group_number` to `created_at DESC`
- `database.types.ts` — removed `group_number` from `plant_groups` Row/Insert/Update; added `batch_registry_id` to all three
- 10 component files updated to use `batch_registry?.batch_number` as primary identifier: `PlantGroupsList`, `PlantGroupDetailPanel`, `NewPlantGroupModal`, `RoomMapCard`, `FlipRoomModal`, `MoveToRoomModal`, `HarvestSessionsList`, `BinningSessionsView`, `CultivationDashboard`, `CultivationWidget`
- Test fixtures + service tests: removed `group_number` from all mock objects; updated `createPlantGroup` test assertion
- Docs: updated `CULTIVATION-ARCHITECTURE.md`, `CULTIVATION.md`, `CHANGELOG.md`

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking

**Next recommendations (in order):**
1. **Real plant data** — user mentioned they are about to add physical plants; first live data test of the cultivation module
2. **Module status update** — update `docs/MODULE-STATUS.md` cultivation entry from "pending" to "complete"
3. **HarvestSessionsList batch link** — completed harvest session rows still lack a "View Batch" navigation link (only Binning Sessions have it); add `onViewChange` → `'batches'` link

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
