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
**Session:** D-2/D-3 — Dry Rooms + Binning Sessions Migration + UI
**Status:** COMPLETE

**What was done:**
- Applied migration `create_dry_rooms_and_binning_sessions`: created `dry_rooms` and `binning_sessions` tables with RLS, triggers 12–13, and indexes
- Added types: `BinningSessionStatus`, `DryRoom`, `BinningSession`, `CreateDryRoomInput`, `UpdateDryRoomInput`, `CreateBinningSessionInput` to `cultivation.types.ts`
- Added 9 new service operations to `cultivation.service.ts`: 4 dry room ops + 5 binning session ops
- Created `useDryRooms` hook — CRUD state for dry_rooms
- Created `useBinningSessions` hook — CRUD state for binning_sessions + unbinnedHarvests
- Created `DryRoomsManagement.tsx` component — full CRUD UI with archive/restore
- Created `BinningSessionsView.tsx` component — Pending/Active/Completed/Cancelled tabs, session cards with yield%
- Added "Binning Sessions" nav entry to Cultivation sidebar (between Harvest Sessions and Grow Rooms)
- Added "Dry Rooms" tab to Settings component (alongside Grow Rooms)
- Wired `cultivation-binning` route in App.tsx with lazy loading

**Build status:** PASSES — clean build, no errors

**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customers.service.test.ts` — 1 pre-existing failure: `zip` vs `postal_code` on line ~126

**Modified files (this session):**
- `supabase/migrations/YYYYMMDDXXXXXX_create_dry_rooms_and_binning_sessions.sql` — NEW
- `src/features/cultivation/types/cultivation.types.ts`
- `src/features/cultivation/services/cultivation.service.ts`
- `src/features/cultivation/hooks/useDryRooms.ts` — NEW
- `src/features/cultivation/hooks/useBinningSessions.ts` — NEW
- `src/features/cultivation/hooks/index.ts`
- `src/features/cultivation/components/DryRoomsManagement.tsx` — NEW
- `src/features/cultivation/components/BinningSessionsView.tsx` — NEW
- `src/features/cultivation/components/index.ts`
- `src/shared/components/navigation/sectionNavigation.ts`
- `src/App.tsx`
- `src/features/settings/components/Settings.tsx`
- `CHANGELOG.md`

**Next recommendations (in order):**
1. **customers.service.test.ts fix** — 1-liner, `zip` → `postal_code` on line ~126
2. **D-4: Testing** — 28 test scenarios in CULTIVATION-RULES.md § Testing Requirements (unit + integration tests for stage transitions, triggers, binning validation)
3. **Type regeneration** — run `npm run types:generate` to sync database.types.ts with live schema (includes all 9 cultivation tables)

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
