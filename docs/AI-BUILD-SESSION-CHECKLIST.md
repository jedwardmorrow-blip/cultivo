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
**Session:** D-12 — Cultivation Label Printing, Mother Stage Guard, Harvest Waste Recording
**Status:** COMPLETE

**What was done:**

Five features added to the cultivation module:

**1. Plant group label printing (two functions)**
- New hook `usePlantGroupLabel.ts` — loads logo, fetches plants if needed, sets up label data; provides `openGroupLabel`, `openPlantLabels`, `printLabels`, `closeLabel`.
- New component `PlantGroupLabelPrintModal.tsx` — 1.5"×2" CODE128 barcode labels; `GroupLabelCard` (batch number, strain, stage, plant count, location) and `IndividualLabelCard` (batch number, strain, individual state_plant_id barcode). Scale prop for preview (3×) vs print (1×). Preview shows first label with count indicator for individual mode.
- Wired into `PlantGroupsList` and `RoomDetailDrawer` via `PlantGroupActionsMenu` actions "Print Group Label" / "Print All Plant Labels".

**2. Mother plant stage guard**
- `PlantGroupActionsMenu` — "Mark as Mother" is disabled (grayed, cursor-not-allowed, tooltip) when group is in `clone` stage. Only enabled at `veg` or `flower`.
- `NewPlantGroupModal` — `is_mother` hardcoded to `false`; checkbox disabled with explanatory note. Mother group source dropdown filtered to only show veg/flower groups.
- New invariant C-45 added to CULTIVATION-RULES.md.

**3. Individual plants viewable in room drawer**
- `RoomDetailDrawer` plant group rows have "View Plant IDs" in the actions menu, deep-linking to the `plants` tab of `PlantGroupDetailPanel`.
- Same behavior wired in `PlantGroupsList` (already existed via `PlantGroupActionsMenu`).

**4. Harvest waste recording**
- Migration `add_waste_grams_to_harvest_sessions` — adds `waste_grams numeric DEFAULT NULL` to `harvest_sessions` (idempotent).
- `HarvestSession` type and `CreateHarvestSessionInput` updated with `waste_grams`.
- `HARVEST_SESSION_SELECT` in service updated.
- `NewHarvestForm` — added optional "Waste Weight (grams)" input with validation (must be < wet weight).
- `SessionRow` — displays waste weight with percentage of display weight when present.
- New invariant C-46 added to CULTIVATION-RULES.md.

**5. Future feature documentation (Items 5, 6, 7, 8, 10)**
- `CULTIVATION.md` updated with "Specified — Pending Future Session" section covering: grow recipes/feeding schedules, additive/nutrient tracking, projected yield & forecasting, labor cost tracking, state compliance push.

**Files changed:**
- `supabase/migrations/add_waste_grams_to_harvest_sessions` (new migration)
- `src/features/cultivation/hooks/usePlantGroupLabel.ts` (new)
- `src/features/cultivation/components/PlantGroupLabelPrintModal.tsx` (new)
- `src/features/cultivation/components/PlantGroupActionsMenu.tsx` (mother guard + print actions)
- `src/features/cultivation/components/NewPlantGroupModal.tsx` (mother guard)
- `src/features/cultivation/components/PlantGroupsList.tsx` (print wiring)
- `src/features/cultivation/components/RoomDetailDrawer.tsx` (print wiring)
- `src/features/cultivation/components/CultivationDashboard.tsx` (type update)
- `src/features/cultivation/components/HarvestSessionsList.tsx` (waste field)
- `src/features/cultivation/types/cultivation.types.ts` (waste_grams)
- `src/features/cultivation/services/cultivation.service.ts` (select update)
- `src/features/cultivation/hooks/index.ts` (new exports)
- `src/features/cultivation/components/index.ts` (new export)
- `docs/CULTIVATION.md` (future features section)
- `docs/CULTIVATION-RULES.md` (C-45, C-46)
- `docs/CHANGELOG.md` (this session entry)

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking

**Next recommendations (in order):**
1. **Real plant data** — first live data test of cultivation module with real plants
2. **Module status update** — update `docs/MODULE-STATUS.md` cultivation entry from "pending" to "complete"
3. **Plant group grouping in PlantGroupsList** — consider grouping by room type (matching the dashboard card grouping) for consistency

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
