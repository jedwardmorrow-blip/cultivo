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
**Session:** C-4 — Room Layout Schema Validation
**Status:** COMPLETE

**What was done:**
- **C-4-1 (migration):** Applied `supabase/migrations/20260219040000_create_room_tables_and_sections.sql`
  - Created `room_tables` (grow_room_id FK, table_number + UNIQUE constraint, table_name, total_sqft, is_active, CHECK table_number > 0)
  - Created `room_sections` (room_table_id FK, section_label + UNIQUE constraint, section_sqft, is_active)
  - RLS enabled on both tables with authenticated SELECT/INSERT/UPDATE policies; no DELETE policy (archive pattern)
  - Performance indexes: `idx_room_tables_grow_room_id`, `idx_room_sections_room_table_id`
- **Documentation:** All three cultivation docs updated to v1.4 — schema overview, table definitions, RLS policies, migration plan, invariants C-18 through C-21, Room Layout subsection
- **No TypeScript changes** — C-4 is DB-only; no service, hook, or UI code touches these tables yet
- **Build:** Passes clean (no TS changes to break anything)

**Build status:** Passes clean

**Known issues (carry-forward, unchanged):**
- 492 tsc errors — pre-existing, not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files (this session):**
- `supabase/migrations/20260219040000_create_room_tables_and_sections.sql` — new migration
- `docs/CULTIVATION-ARCHITECTURE.md` — v1.4: added room_tables/room_sections schema, RLS, C-4 migration entry
- `docs/CULTIVATION-RULES.md` — v1.4: added invariants C-18 through C-21
- `docs/CULTIVATION.md` — v1.4: updated scope, module entities, Room Layout subsection
- `docs/AI-BUILD-SESSION-CHECKLIST.md` — this file

**Critical context for next session (C-5):**
- `room_tables` and `room_sections` are live in the DB with RLS — no UI or service layer exists yet
- C-5 should add FK columns `room_table_id` (uuid, nullable) and `room_section_id` (uuid, nullable) to `plant_groups` to wire plant placement
- `cultivation.types.ts` must be updated when C-5 adds placement FK columns — add `RoomTable`, `RoomSection` types and update `PlantGroup` interface
- The Cultivation module (C-2/C-3) is still fully functional — no regressions from C-4

**Previous session context (C-2/C-3 — still relevant):**
- All 5 core cultivation tables + 9 triggers live: `grow_rooms`, `plant_groups`, `plant_group_stage_history`, `plant_group_room_history`, `harvest_sessions`
- Strains without a valid 3-letter abbreviation are blocked at the DB level on harvest creation
- The `group_number` field is set to `'PENDING'` on INSERT — replaced immediately by `trg_generate_plant_group_number`
- Grow Rooms tab already exists in Settings (`src/features/settings/components/Settings.tsx`)

**Next recommendations:**
- **C-5: Plant Placement** — add `room_table_id` and `room_section_id` FK columns to `plant_groups`, add table/section management UI to Settings → Grow Rooms, add placement selector to NewPlantGroupModal and PlantGroupDetailPanel
- **Operator testing** — create a grow room, create a plant group, advance through stages, harvest, verify batch_registry entry appears in Batches module
- **Type generation** — run `npm run types:generate` to pull in cultivation table types from live schema (now includes room_tables and room_sections)
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
