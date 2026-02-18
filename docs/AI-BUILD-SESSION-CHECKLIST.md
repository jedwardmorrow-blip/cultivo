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
**Session:** C-1 — Cultivation module documentation
**Status:** COMPLETE

**What was done:**
- Created `docs/CULTIVATION.md` — full scope, entity map, lifecycle diagram, grow rooms, plant groups, growth stages, harvest sessions, harvest→batch handoff, compliance fields, UI screens, navigation integration, open questions
- Created `docs/CULTIVATION-ARCHITECTURE.md` — complete DB schema (4 tables), RLS policies, 6 triggers with full SQL, migration plan (3 migrations), frontend module structure, service layer signatures, TypeScript type definitions
- Created `docs/CULTIVATION-RULES.md` — 10 invariants with rationale, 6 architectural decisions with rationale, error message table, testing requirements checklist
- Updated `docs/AI-SESSION-BRIEF.md` — added cultivation docs section, updated lifecycle description, updated session log
- Updated `docs/AI-BUILD-SESSION-CHECKLIST.md` — this file
- Updated `docs/SYSTEM-WORKFLOW.md` — added Section 0 (cultivation) entry
- Updated `docs/BATCHES.md` — added cultivation linkage note
- Updated `CLAUDE.md` — added cultivation docs to Before You Code section

**Verification results:**
- No code or migration changes — documentation only
- Build status: unchanged (was passing clean as of last code session)

**Build status:** Passes clean (unchanged from last code session)

**Known issues (carry-forward, unchanged):**
- 492 tsc errors — pre-existing, not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126
- `getProductStageIdFromProductName` error-path tests deferred (module-level cache issue)

**New files:**
- `docs/CULTIVATION.md`
- `docs/CULTIVATION-ARCHITECTURE.md`
- `docs/CULTIVATION-RULES.md`

**Modified files:**
- `docs/AI-SESSION-BRIEF.md`
- `docs/AI-BUILD-SESSION-CHECKLIST.md`
- `docs/SYSTEM-WORKFLOW.md`
- `docs/BATCHES.md`
- `CLAUDE.md`
- `CHANGELOG.md`

**Migrations:** None

**Critical context for next session (C-2: migrations):**
- Read `CULTIVATION.md`, `CULTIVATION-ARCHITECTURE.md`, and `CULTIVATION-RULES.md` BEFORE writing any SQL
- Verify `strains.abbreviation` column exists before writing the harvest trigger
- Three migrations needed: C-2-1 (tables + RLS), C-2-2 (triggers), C-2-3 (optional seed data)
- The harvest completion trigger uses `ON CONFLICT (batch_number) DO NOTHING` — this is intentional for same-strain same-day harvests
- All 10 invariants in CULTIVATION-RULES.md are locked — no changes without discussion

**Next recommendations:**
- **Session C-2** — Run the three cultivation migrations (tables, triggers, seed rooms). No UI work yet.
- **Session C-3** — Build the Cultivation UI: CultivationDashboard, PlantGroupsList, HarvestSessionForm, GrowRoomsManagement (in Settings)
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
