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
**Session:** D-14 — Room-Based Harvest Workflow with Multi-Weight Entries
**Status:** COMPLETE

**What was done:**

Replaced the old inline harvest form with a full 3-step room-based harvest workflow. Added multi-weight entry support and dry room assignment at harvest time.

**1. Database migration**
- Added `grow_room_id` (FK → grow_rooms) and `dry_room_id` (FK → dry_rooms) columns to `harvest_sessions`
- Created `harvest_weight_entries` table (weight_grams, plant_count, entry_order per session) with RLS and indexes

**2. Service layer (6 new methods)**
- `listHarvestWeightEntries`, `createHarvestWeightEntry`, `deleteHarvestWeightEntry`
- `finalizeHarvest` (aggregates weight entries → session totals, sets dry_room_id, completes session)
- `listHarvestSessionsByDryRoom`, `listDryingHarvests`

**3. Hooks**
- New `useHarvestWeightEntries` hook (entries, totals, add/remove)
- Updated `useHarvestSessions` with `finalizeHarvest` method

**4. Harvest workflow UI (4 new components)**
- `HarvestRoomSelect` — flower room grid selector
- `HarvestWeightRecorder` — per-group weight cards with progress bars, inline entry forms, waste recording
- `HarvestReviewFinalize` — summary with dry room picker and one-click finalize
- `HarvestWorkflow` — orchestrator with 3-step state machine and breadcrumb navigation

**5. Updated views**
- `HarvestSessionsList` — removed inline form, "Start Harvest" opens workflow, added grow/dry room badges, room filter
- `CultivationDashboard` — new Dry Rooms section showing active rooms with drying harvests
- `BinningSessionsView` — renamed heading to "Drying"
- Navigation: "Harvests", "Drying", new "Dry Rooms" nav item

**Files created:**
- `src/features/cultivation/components/harvest/HarvestRoomSelect.tsx`
- `src/features/cultivation/components/harvest/HarvestWeightRecorder.tsx`
- `src/features/cultivation/components/harvest/HarvestReviewFinalize.tsx`
- `src/features/cultivation/components/harvest/HarvestWorkflow.tsx`
- `src/features/cultivation/components/harvest/index.ts`
- `src/features/cultivation/hooks/useHarvestWeightEntries.ts`

**Files modified:**
- `src/features/cultivation/types/cultivation.types.ts` (HarvestWeightEntry type, session room fields)
- `src/features/cultivation/services/cultivation.service.ts` (6 new methods, updated select)
- `src/features/cultivation/hooks/useHarvestSessions.ts` (finalizeHarvest)
- `src/features/cultivation/hooks/index.ts` (new export)
- `src/features/cultivation/components/HarvestSessionsList.tsx` (rewritten)
- `src/features/cultivation/components/CultivationDashboard.tsx` (dry rooms section)
- `src/features/cultivation/components/BinningSessionsView.tsx` (rename)
- `src/features/cultivation/components/index.ts` (new export)
- `src/shared/components/navigation/sectionNavigation.ts` (renames + new item)
- `src/App.tsx` (dry rooms route)
- `docs/CULTIVATION.md`, `docs/CULTIVATION-ARCHITECTURE.md`, `docs/CULTIVATION-RULES.md`
- `CHANGELOG.md`

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
