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
**Session:** D-1 — Binning Session + Dry Room Documentation
**Status:** COMPLETE

**What was done:**
- **Documentation-only session.** No migrations, no code changes, no risk.
- All three core cultivation docs updated to **v1.7**:
  - `CULTIVATION.md` — added Dry Rooms and Binning Sessions to scope, entities, lifecycle, compliance fields, UI screens (§4 Dry Rooms Settings, §5 Binning Sessions), and navigation
  - `CULTIVATION-ARCHITECTURE.md` — added full DDL for `dry_rooms` and `binning_sessions`, RLS policies, Triggers 12–13 (`trg_protect_dry_room_code`, `trg_validate_binning_session`), Migration D-2-1 entry (pending), 9 new planned service ops, TypeScript types
  - `CULTIVATION-RULES.md` — added invariants C-30 through C-37, new decisions (Dry Rooms in Settings, Binning is data-capture only, batch_registry_id denormalized), 4 new error messages, 7 new test scenarios
- `ARCHITECTURE-DECISIONS.md` — added Decision 13 (Binning Session is Data-Capture, Not an Inventory Event)

**Key design decisions made (D-1):**
- Binning sessions do NOT create inventory (invariant C-37, Decision 13) — dry weight is a reference figure only
- `batch_registry_id` on `binning_sessions` is denormalized from harvest session; trigger validates consistency
- `dry_rooms.room_code` is immutable after creation (mirrors grow_rooms pattern, invariant C-30)
- 1:1 UNIQUE constraint: one binning session per harvest session (invariant C-33)

**Build status:** Passes (documentation-only session — no source code changes)

**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files (this session):**
- `docs/CULTIVATION.md` — v1.7
- `docs/CULTIVATION-ARCHITECTURE.md` — v1.7
- `docs/CULTIVATION-RULES.md` — v1.7
- `docs/ARCHITECTURE-DECISIONS.md` — added Decision 13
- `docs/AI-BUILD-SESSION-CHECKLIST.md` — this file

**Critical context for next session (D-2: Migration — dry_rooms + binning_sessions):**
- DDL is fully specified in `CULTIVATION-ARCHITECTURE.md` — copy directly into migration file
- Triggers 12 and 13 PL/pgSQL bodies are fully written in the architecture doc
- RLS policies are fully written — authenticated-only, no DELETE, no anon
- Migration filename should follow pattern: `20260219XXXXXX_create_dry_rooms_and_binning_sessions.sql`
- `batch_registry_id` FK on `binning_sessions` references `batch_registry(id)` — confirm that table name (check existing migrations)
- After D-2 migration: run D-3 (UI — DryRoomsManagement settings component + BinningSessionsView cultivation component)

**Next recommendations (in order):**
1. **D-2: Migration** — apply `dry_rooms` + `binning_sessions` DDL, triggers, RLS (use architecture doc as blueprint)
2. **D-3: UI** — `DryRoomsManagement.tsx` (Settings) + `BinningSessionsView` (Cultivation → Binning Sessions tab)
3. **customers.service.test.ts fix** — 1-liner, `zip` → `postal_code` on line ~126

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
