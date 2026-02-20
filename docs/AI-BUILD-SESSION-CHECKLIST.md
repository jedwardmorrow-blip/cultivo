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
**Session:** Documentation alignment — E-1/D-14 constraint fix + cross-doc sync
**Status:** COMPLETE

**What was done:**

Fixed a database constraint bug and synchronized documentation across 4 docs to accurately reflect the E-1 (batch-at-clone-time) and D-14 (empty-shell harvest) patterns.

**1. Database migration (relax_harvest_session_check_constraints)**
- Changed `harvest_sessions.wet_weight_grams` CHECK from `> 0` to `>= 0`
- Changed `harvest_sessions.plant_count_harvested` CHECK from `> 0` to `>= 0`
- Enables D-14 empty-shell pattern: session starts at 0, entries recorded in `harvest_weight_entries`, aggregated at finalization

**2. CULTIVATION-RULES.md (v2.3)**
- Updated C-8/C-9 invariant box text to clarify D-14 empty-shell vs completion-time enforcement
- Added C-39 (batch created at plant group creation, `pre_harvest` state)
- Added C-40 (harvest completion updates existing pre_harvest batch)

**3. CULTIVATION-ARCHITECTURE.md (v2.1)**
- Updated `harvest_sessions` table definition: `>= 0` CHECK constraints, added `grow_room_id`, `dry_room_id`, `waste_grams`
- Replaced `fn_complete_harvest_session` trigger with live E-1 version (two-path: UPDATE existing pre_harvest batch vs legacy INSERT)
- Updated trigger design notes

**4. CULTIVATION.md (v2.0)**
- Rewrote Lifecycle Overview (Section 4): batch born at step 3 (clone), D-14 empty-shell at step 6, weight entries at step 6a, E-1 UPDATE at step 7

**5. BATCHES.md (v2.5)**
- Added `pre_harvest` state to lifecycle pipeline, state definitions table, CHECK constraint, state queries, and state machine diagram
- Updated Batch Creation note to reflect E-1 is LIVE

**Files modified (docs only — no code changes):**
- `docs/CULTIVATION-RULES.md`
- `docs/CULTIVATION-ARCHITECTURE.md`
- `docs/CULTIVATION.md`
- `docs/BATCHES.md`
- `docs/AI-BUILD-SESSION-CHECKLIST.md`

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
