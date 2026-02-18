---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-18
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-18
**Session:** C-1b — Documentation pass: mother plants, room transfers, weight adjustments, abbreviation hardening
**Status:** COMPLETE

**What was done:**
- Updated `CULTIVATION.md` to v1.1: added Mother Plants section, Room Transfers section, Harvest Weight Adjustments section, updated entity map, lifecycle diagram, UI screens, scope, version history
- Updated `CULTIVATION-ARCHITECTURE.md` to v1.1: added `plant_group_room_history` table + RLS + trigger, added `mother_plant_group_id`/`is_mother`/`group_number` to `plant_groups`, added `adjusted_weight_grams`/`adjustment_reason` to `harvest_sessions`, added `mother` room type, added `fn_generate_plant_group_number` trigger, added `fn_log_plant_group_room_history` trigger, added `fn_sync_harvest_weight_adjustment` trigger, removed COALESCE fallback from `fn_complete_harvest_session`, updated migration plan (5 tables, 9 trigger pairs), updated service signatures and type definitions
- Updated `CULTIVATION-RULES.md` to v1.1: added invariants C-11 through C-16, added rule detail sections for each, added new decisions (mother flag, clone lineage FK, room transfer trigger-driven, abbreviation required, weight adjustment), added new error messages, expanded testing requirements to 17 scenarios

**Build status:** Passes clean (no code changes this session)

**Known issues (carry-forward, unchanged):**
- 492 tsc errors — pre-existing, not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126
- `getProductStageIdFromProductName` error-path tests deferred (module-level cache issue)

**Modified files (docs only):**
- `docs/CULTIVATION.md` — v1.0 → v1.1
- `docs/CULTIVATION-ARCHITECTURE.md` — v1.0 → v1.1
- `docs/CULTIVATION-RULES.md` — v1.0 → v1.1
- `docs/AI-BUILD-SESSION-CHECKLIST.md`

**No migrations, no code changes this session.**

**Critical context for next session (C-2: migrations):**
- Read `CULTIVATION.md`, `CULTIVATION-ARCHITECTURE.md`, and `CULTIVATION-RULES.md` BEFORE writing any SQL — all three are now v1.1
- The schema now has FIVE tables (not four): grow_rooms, plant_groups, plant_group_stage_history, **plant_group_room_history**, harvest_sessions
- `plant_groups` now has: `group_number` (auto-generated, UNIQUE NOT NULL), `mother_plant_group_id` (nullable self-ref FK), `is_mother` (boolean, default false)
- `harvest_sessions` now has: `adjusted_weight_grams` (nullable numeric), `adjustment_reason` (nullable text), two new CHECK constraints
- Migration C-2-2 now creates NINE trigger+function pairs (not six) — see architecture doc for full ordered list
- COALESCE fallback is GONE — `fn_generate_plant_group_number` AND `fn_complete_harvest_session` both raise hard errors if `strains.abbreviation` is null
- `batch_registry.created_by` column exists (added pre-C-1b)
- Navigation shell, route cases, and interim TypeScript types are already wired from pre-C-1b session
- Interim types in `src/features/cultivation/types/cultivation.types.ts` must be updated after C-2 runs to add: `group_number`, `mother_plant_group_id`, `is_mother`, `PlantGroupRoomHistory`, `adjusted_weight_grams`, `adjustment_reason`

**Next recommendations:**
- **Session C-2** — Run the cultivation migrations (tables, triggers, optional seed rooms). No UI work yet.
- **Session C-3** — Settings: Grow Rooms UI
- **Session C-4** — Plant Groups UI (list, create with mother selector, advance stage, move to room, toggle mother)
- **Session C-5** — Harvest Sessions UI (start, complete, cancel, adjust weight)
- **Session C-6** — Integration verification + cleanup
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
