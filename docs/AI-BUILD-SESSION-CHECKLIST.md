---
title: AI Build Session Checklist
category: AI Development
updated: 2026-03-01
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-03-07
**Session:** Rosin Lab Module Shell + Navigation
**Status:** COMPLETE

**What was done:**

Created the Rosin Lab module shell — a new top-level section in the app with a left-sidebar subnav, pipeline visualization, stats cards, and active work table on the dashboard. All other screens show "Coming Soon" placeholders. No database schema exists yet for rosin lab tables; service queries gracefully return empty data.

**Key changes:**
- New `rosin-lab` section in `sectionNavigation.ts` with 8 sub-items (Dashboard, Fresh Frozen, Hash, Rosin, New Wash, Press, Press & Cure Log, Analytics)
- `RosinLabModule` renders a 220px left sidebar + content area, derives active screen from `currentView` prop (no internal useState needed)
- Left sidebar nav (`RosinLabNav`) shows active accent border, inactive secondary text, and colored dot indicators for Wash/Press/Cure when `activeCounts > 0`
- Pipeline cards (`PipelineStages`) are clickable, show live counts, stage-color top borders, and arrows between stages
- Dashboard stats row (4 stat cards) and active work table with stage-colored row left borders
- 6 new Tailwind color tokens: `cult-stage-ff`, `cult-stage-wash`, `cult-stage-fd`, `cult-stage-hash`, `cult-stage-press`, `cult-stage-rosin`
- App.tsx: `RosinLabModule` lazy-loaded; handled in `default` branch via `currentView.startsWith('rosin-lab')`

**Files created:**
- `src/features/rosin-lab/RosinLabModule.tsx`
- `src/features/rosin-lab/components/PipelineStages.tsx`
- `src/features/rosin-lab/components/RosinLabNav.tsx`
- `src/features/rosin-lab/screens/RosinDashboard.tsx`
- `src/features/rosin-lab/services/rosinLabService.ts`
- `src/features/rosin-lab/types/rosin-lab.types.ts`
- `src/features/rosin-lab/index.ts`

**Files modified:**
- `App.tsx` — lazy import + rosin-lab default case
- `tailwind.config.js` — 6 new stage color tokens
- `src/shared/components/navigation/sectionNavigation.ts` — new section + 6 new icon imports
- `CHANGELOG.md` — session entry added

**Build status:** PASSES (✓ clean, 0 errors)
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors -- not blocking (baseline ~501 as of 2026-02-18)
- `customer_price_lists` RLS uses `USING (true)` -- pre-existing, not changed this session
- Rosin lab DB tables (`wash_runs`, `press_runs`, `fresh_frozen_packages`, etc.) do not exist yet; service uses `as any` cast and returns empty defaults

**Next steps:**
- Prompt #2: Fresh Frozen intake form + storage table
- Prompt #3: Wash run form (select FF batch, log input/output/yield)
- Prompt #4: Press run form + cure session creation
- Database migration needed: create rosin lab schema (wash_runs, press_runs, fresh_frozen_packages, rosin_cure_sessions, v_rosin_pipeline_status view)

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
