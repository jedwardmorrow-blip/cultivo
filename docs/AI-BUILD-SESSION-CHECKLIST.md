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
**Session:** C-2/C-3 — Cultivation Module Full Implementation
**Status:** COMPLETE

**What was done:**
- **C-2-1 (tables):** All 5 cultivation tables confirmed in DB — `grow_rooms`, `plant_groups`, `plant_group_stage_history`, `plant_group_room_history`, `harvest_sessions` — with RLS enabled and full authenticated-user policies
- **C-2-2 (triggers):** All 9 triggers confirmed in DB — group number generation, stage history log, room history log, forward-only stage validation, strain immutability, room_code immutability, harvest completion (creates batch_registry entry), cancellation guard, weight adjustment validation
- **Service layer:** `src/features/cultivation/services/cultivation.service.ts` — 18 operations across grow rooms, plant groups, and harvest sessions
- **Hooks:** `useGrowRooms`, `usePlantGroups`, `useHarvestSessions` — all three fully implemented with reactive state and service wrappers
- **UI components (7):** `CultivationDashboard`, `GrowRoomsManagement`, `PlantGroupsList`, `HarvestSessionsList`, `NewPlantGroupModal`, `MoveToRoomModal`, `PlantGroupDetailPanel` — all fully implemented, none are placeholder "Coming Soon" stubs
- **StrainsManagement hardening:** Force-uppercase abbreviation input, max 3 chars, save disabled until exactly 3 uppercase letters, amber warning inline, "No abbreviation — harvest blocked" badge on existing strain cards with missing/invalid abbreviation
- **Build:** Passes clean

**Build status:** Passes clean

**Known issues (carry-forward, unchanged):**
- 492 tsc errors — pre-existing, not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files:**
- `src/features/products/components/StrainsManagement.tsx` — abbreviation hardening
- `src/features/cultivation/types/cultivation.types.ts` — complete interim type definitions
- `src/features/cultivation/services/cultivation.service.ts` — full service layer (new)
- `src/features/cultivation/services/index.ts` — barrel export
- `src/features/cultivation/hooks/useGrowRooms.ts` — new
- `src/features/cultivation/hooks/usePlantGroups.ts` — new
- `src/features/cultivation/hooks/useHarvestSessions.ts` — new
- `src/features/cultivation/hooks/index.ts` — barrel export
- `src/features/cultivation/components/CultivationDashboard.tsx` — full implementation
- `src/features/cultivation/components/GrowRoomsManagement.tsx` — full implementation
- `src/features/cultivation/components/PlantGroupsList.tsx` — full implementation
- `src/features/cultivation/components/HarvestSessionsList.tsx` — full implementation
- `src/features/cultivation/components/NewPlantGroupModal.tsx` — new
- `src/features/cultivation/components/MoveToRoomModal.tsx` — new
- `src/features/cultivation/components/PlantGroupDetailPanel.tsx` — new
- `src/features/cultivation/components/index.ts` — full barrel export
- `CHANGELOG.md`

**Critical context for next session:**
- The Cultivation module is fully functional end-to-end — database, service, hooks, UI all wired
- Strains without a valid 3-letter abbreviation will be blocked at the DB level on harvest creation (trigger raises error)
- `cultivation.types.ts` is interim (hand-authored) — after any schema changes, regenerate `database.types.ts` via `npm run types:generate` and migrate the types to derive from `Database['public']['Tables']`
- The `group_number` field is set to `'PENDING'` on INSERT and immediately replaced by `trg_generate_plant_group_number` — do not rely on the value between INSERT and trigger execution
- Grow Rooms tab already exists in Settings (`src/features/settings/components/Settings.tsx`) — no further routing needed

**Next recommendations:**
- **Operator testing** — create a grow room, create a plant group, advance through stages, harvest, verify batch_registry entry appears in Batches module
- **Type generation** — run `npm run types:generate` to pull in cultivation table types from live schema, then update `cultivation.types.ts` to derive from generated types (optional but good hygiene)
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
