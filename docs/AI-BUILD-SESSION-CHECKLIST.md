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
**Session:** C-5B — Plant Group Placement + Flip Room + Layout Builder + Room Map
**Status:** COMPLETE

**What was done:**
- **C-5B-1 (migration):** Applied `supabase/migrations/20260219060000_add_plant_group_placement_columns.sql`
  - Added `room_table_id` (uuid, nullable, FK → room_tables) to `plant_groups`
  - Added `room_section_id` (uuid, nullable, FK → room_sections) to `plant_groups`
  - Added CHECK constraint `room_section_requires_table`
  - Added partial indexes on both FK columns
  - Trigger `trg_clear_placement_on_room_transfer` (BEFORE UPDATE) — NULLs placement when grow_room_id changes
  - Trigger `trg_validate_placement_room` (BEFORE INSERT OR UPDATE) — validates table belongs to same room as group
- **Types updated:** `cultivation.types.ts`
  - `PlantGroup` — added `room_table_id`, `room_section_id`, join types `room_tables`, `room_sections`
  - New input types: `CreateRoomTableInput`, `UpdateRoomTableInput`, `CreateRoomSectionInput`, `UpdatePlantGroupPlacementInput`, `FlipRoomInput`
- **Service extended:** `cultivation.service.ts`
  - `listRoomTables` extended with `includeArchived` option
  - Added: `createRoomTable`, `updateRoomTable`, `archiveRoomTable`
  - Added: `createRoomSection`, `archiveRoomSection`
  - Added: `flipRoom(input)` — sets flip_date on all active sections, advances eligible groups to flower
  - Added: `listPlantGroupsByRoom(growRoomId)`, `updatePlantGroupPlacement(id, input)`
  - `PLANT_GROUP_SELECT` updated to include placement fields and joins
- **Hooks extended:**
  - `useRoomSections` — added `createTable`, `updateTable`, `archiveTable`, `createSection`, `archiveSection`, `allSections`, `includeArchived` option
  - New hook: `usePlantGroupPlacement` — wraps `updatePlantGroupPlacement` with loading/error state
  - Exported from `hooks/index.ts`
- **New components:**
  - `LayoutBuilder.tsx` — Settings-only surface; Tables + Sections CRUD with archive/restore, show/hide archived toggle
  - `FlipRoomModal.tsx` — bulk Flip Room action; detects isUpdate from existing flower groups; date picker; before/after stage badges
  - `RoomMapCard.tsx` — Cultivation view; expandable room card; table×section grid; strain legend; unplaced groups list; integrated FlipRoomModal
- **UI updated:**
  - `GrowRoomsManagement.tsx` — added "Configure Layout" accordion to each active room card (renders `LayoutBuilder`)
  - `MoveToRoomModal.tsx` — two-step flow: room selection → optional section assignment; DB trigger clears old placement on room transfer
  - `CultivationDashboard.tsx` — Grow Rooms section now renders `RoomMapCard` per room instead of static tiles; group click opens `PlantGroupDetailPanel`
  - `components/index.ts` — exported `FlipRoomModal`, `RoomMapCard`, `LayoutBuilder`
- **Documentation:** All three cultivation docs updated to v1.6
  - `CULTIVATION-RULES.md` — added invariants C-23 through C-29
  - `CULTIVATION-ARCHITECTURE.md` — updated plant_groups schema, triggers 10-11, migration plan, service/types/hooks
  - `CULTIVATION.md` — updated scope, entities, UI Screens

**Build status:** Verify with `npm run build`

**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files (this session):**
- `supabase/migrations/20260219060000_add_plant_group_placement_columns.sql` — new migration (applied)
- `src/features/cultivation/types/cultivation.types.ts` — placement fields + new input types
- `src/features/cultivation/services/cultivation.service.ts` — table/section CRUD, flipRoom, placement, listPlantGroupsByRoom
- `src/features/cultivation/hooks/useRoomSections.ts` — full CRUD + includeArchived + allSections
- `src/features/cultivation/hooks/usePlantGroupPlacement.ts` — new hook
- `src/features/cultivation/hooks/index.ts` — added usePlantGroupPlacement export
- `src/features/cultivation/components/LayoutBuilder.tsx` — new component
- `src/features/cultivation/components/FlipRoomModal.tsx` — new component
- `src/features/cultivation/components/RoomMapCard.tsx` — new component
- `src/features/cultivation/components/GrowRoomsManagement.tsx` — added LayoutBuilder accordion
- `src/features/cultivation/components/MoveToRoomModal.tsx` — two-step section-aware flow
- `src/features/cultivation/components/CultivationDashboard.tsx` — RoomMapCard integration
- `src/features/cultivation/components/index.ts` — exports for new components
- `docs/CULTIVATION-RULES.md` — v1.6
- `docs/CULTIVATION-ARCHITECTURE.md` — v1.6
- `docs/CULTIVATION.md` — v1.6
- `docs/AI-BUILD-SESSION-CHECKLIST.md` — this file

**Critical context for next session (C-6: FLW-08 seed data / Harvest workflow):**
- `room_table_id` / `room_section_id` are nullable FKs on `plant_groups` — placement is optional
- DB triggers enforce: (1) clear placement on room transfer, (2) table must belong to same room as group
- `flipRoom` calls are sequential per group — if one group update fails, prior groups remain advanced (no transaction rollback in service layer); monitor for partial failures
- `LayoutBuilder` is Settings-only — Cultivation view (RoomMapCard) is read-only for structure; directs users to Settings when no layout configured
- **Invariant C-27 enforced:** Settings owns structure CRUD; Cultivation view owns plant actions only
- `plant_actions` family defined (C-29): `advanceStage`, `moveToRoom`, `setMotherStatus`, `updatePlantGroupPlacement`, `flipRoom`, `createHarvestSession`

**Next recommendations:**
- **C-6: FLW-08 setup** — create FLW-08 room in DB, configure tables/sections, create plant groups, assign placements, set flip dates
- **PlantGroupDetailPanel placement editor** — add section assignment UI to the detail panel (currently only visible in MoveToRoomModal step 2)
- **NewPlantGroupModal placement** — optionally allow placement at creation time
- **customers.service.test.ts fix** — 1-liner, `zip` → `postal_code`

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
