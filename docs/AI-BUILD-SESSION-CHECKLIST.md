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
**Session:** C-5A — Section Run Dates (Flip Date + Projected Harvest Date)
**Status:** COMPLETE

**What was done:**
- **C-5A-1 (migration):** Applied `supabase/migrations/20260219050000_add_run_dates_to_room_sections.sql`
  - Added `flip_date` (date, nullable) to `room_sections`
  - Added `projected_harvest_date` (date, nullable) to `room_sections`
  - No new triggers or RLS policies needed — existing authenticated UPDATE policy covers new columns
- **Types updated:** `src/features/cultivation/types/cultivation.types.ts`
  - Added `RoomSection` interface (includes flip_date, projected_harvest_date)
  - Added `RoomTable` interface (with nested `sections: RoomSection[]`)
  - Added `UpdateRoomSectionInput` type
- **Service extended:** `src/features/cultivation/services/cultivation.service.ts`
  - Added `listRoomTables(growRoomId)` — fetches tables + nested sections for a room
  - Added `updateRoomSection(id, input)` — updates section fields including run dates
- **New hook:** `src/features/cultivation/hooks/useRoomSections.ts`
  - `useRoomSections(growRoomId)` — loads tables/sections on mount, exposes `updateSection()`
  - Exported from `hooks/index.ts`
- **UI updated:** `src/features/cultivation/components/GrowRoomsManagement.tsx`
  - Flower room cards now have a chevron expand button revealing "Section Run Dates" panel
  - Each section shows flip date, "Day N" badge, projected harvest date, run length, countdown
  - Dates edited inline (click to edit, Enter/blur to save, Escape to cancel, X to clear)
  - Non-flower rooms: no expand button, no dates shown
- **Documentation:** All three cultivation docs + checklist updated to v1.5
  - `CULTIVATION-ARCHITECTURE.md` — updated room_sections schema, added C-5A migration, updated types/service/hooks sections
  - `CULTIVATION-RULES.md` — added invariant C-22 (run dates are mutable operational notes)
  - `CULTIVATION.md` — updated scope, module entities, UI Screens → Grow Rooms section with full date panel description

**Build status:** Clean (verify with `npm run build`)

**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files (this session):**
- `supabase/migrations/20260219050000_add_run_dates_to_room_sections.sql` — new migration
- `src/features/cultivation/types/cultivation.types.ts` — added RoomSection, RoomTable, UpdateRoomSectionInput
- `src/features/cultivation/services/cultivation.service.ts` — added listRoomTables, updateRoomSection
- `src/features/cultivation/hooks/useRoomSections.ts` — new hook
- `src/features/cultivation/hooks/index.ts` — added useRoomSections export
- `src/features/cultivation/components/GrowRoomsManagement.tsx` — full rewrite with section panel
- `docs/CULTIVATION-ARCHITECTURE.md` — v1.5
- `docs/CULTIVATION-RULES.md` — v1.5
- `docs/CULTIVATION.md` — v1.5
- `docs/AI-BUILD-SESSION-CHECKLIST.md` — this file

**Critical context for next session (C-5B):**
- `RoomSection` and `RoomTable` types are now defined in `cultivation.types.ts` — do NOT duplicate them
- `listRoomTables` returns sections sorted by `section_label` alphabetically, filtered to `is_active = true`
- Run dates are **section-level** (not room-level) — a room can have different flip dates per section to support mixed batch runs
- The `RunDates` component uses local state for flip/harvest values; it reads from `section.flip_date` / `section.projected_harvest_date` as props — after an `updateSection` call the hook reloads and passes fresh props down
- C-5B should add `room_table_id` (uuid, nullable) and `room_section_id` (uuid, nullable) FK columns to `plant_groups` to wire plant placement to specific sections

**Previous session context (C-2/C-3/C-4 — still relevant):**
- All 5 core cultivation tables + 9 triggers live: `grow_rooms`, `plant_groups`, `plant_group_stage_history`, `plant_group_room_history`, `harvest_sessions`
- Grow Rooms tab already exists in Settings (`src/features/settings/components/Settings.tsx`)
- `room_tables` and `room_sections` are live in DB with RLS; run dates columns are live (C-5A)

**Next recommendations:**
- **C-5B: Plant Placement** — add `room_table_id` and `room_section_id` FK columns to `plant_groups`, add table/section management UI to Settings → Grow Rooms, add placement selector to NewPlantGroupModal and PlantGroupDetailPanel
- **Operator testing** — open a flower room card, click the chevron, set a flip date on a section, verify Day N badge and countdown appear correctly
- **Type generation** — run `npm run types:generate` to pull in cultivation table types from live schema
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
