---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-20
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-20
**Session:** D-13 — Individual Plant Actions, Expanded View Enrichment, Feature Parity
**Status:** COMPLETE

**What was done:**

Four features implemented across the cultivation module:

**1. Shared ExpandedPlantsList component**
- New component `ExpandedPlantsList.tsx` — extracted from `RoomDetailDrawer` inline code into a standalone shared component.
- Used identically in both Plant Groups tab and Room Detail drawer (feature parity, invariant C-48).
- Metadata header: Mother Plant ID, Clone Date, Stage Entered date, Days in Stage.
- Per-plant print icon on each active plant row.
- Checkbox multi-select with "Select All / Deselect All" toggle.
- Bulk "Deactivate" action with confirmation step for selected plants.
- Smart print button: "Print All (N)" when nothing selected, "Print Selected (N)" when subset selected.

**2. Single-plant and selected-plant label printing**
- `usePlantGroupLabel` hook — two new methods: `openSinglePlantLabel(plant, group)` and `openSelectedPlantLabels(plants, group)`.
- Reuses existing `PlantGroupLabelPrintModal` with single-element or subset arrays.

**3. PlantGroupsList expand/click behavior (feature parity)**
- Plant group rows are now clickable/expandable (chevron icon, accordion toggle).
- Expanding a row shows the full `ExpandedPlantsList` inline — identical to Room Drawer behavior.
- Three-dot action menu preserved with `stopPropagation`.

**4. PLANT_GROUP_SUMMARY_SELECT fix**
- Added `grow_rooms (name, room_code)` and `mother_group` relation to the summary query.
- Room codes now display correctly in Plant Groups tab.
- Mother plant ID now available without a separate query.

**Files changed:**
- `src/features/cultivation/components/ExpandedPlantsList.tsx` (new)
- `src/features/cultivation/components/PlantGroupsList.tsx` (expand behavior, import shared component)
- `src/features/cultivation/components/RoomDetailDrawer.tsx` (replaced inline ExpandedPlantsList with shared component)
- `src/features/cultivation/components/index.ts` (new export)
- `src/features/cultivation/hooks/usePlantGroupLabel.ts` (two new methods)
- `src/features/cultivation/services/cultivation.service.ts` (PLANT_GROUP_SUMMARY_SELECT fix)
- `docs/CULTIVATION-RULES.md` (C-47, C-48)
- `docs/AI-BUILD-SESSION-CHECKLIST.md` (this handoff)
- `CHANGELOG.md` (session entry)

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking

**Next recommendations (in order):**
1. **Move to Group action** — implement the plant-level "Move to Group" workflow (requires target group selection modal, strain validation, plant_count sync)
2. **Move to Room action** — split selected plants into a new group in a different room
3. **Partial harvest** — harvest a subset of plants from a flower-stage group
4. **Real plant data** — first live data test of cultivation module with real plants

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
