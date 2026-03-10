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

**Date:** 2026-03-09
**Session:** L10/EOS Personal Todos System — Pages, Hooks & Types
**Status:** COMPLETE

**What was done:**

Added the L10/EOS personal todos system front-end: calendar page, dashboard page, personal todos page, admin panel, usePersonalTodos hook, and L10/EOS type definitions in `types/index.ts`. Fixed a build-breaking issue where the types barrel file lost its original re-exports.

**Key changes:**
- `CalendarPage.tsx` — Monthly calendar view with personal + team todos, drag-drop support
- `DashboardPage.tsx` — Main dashboard with north star, goals, rocks, todos, issues overview + Claude Recommendations widget
- `PersonalTodosPage.tsx` — Full personal todos management with recurring items, categories, priorities
- `AdminPanel.tsx` — Admin panel for team todo management
- `usePersonalTodos.ts` — Hook for personal todo CRUD operations (create, update, toggle, delete, reorder)
- `types/index.ts` — Added L10/EOS interfaces (Profile, Business, Plan, Goal, Rock, ScorecardMetric, ScorecardEntry, Meeting, Issue, Todo, Checkin, PersonalTodo, PersonalTodoCompletion, ClaudeRecommendation) while preserving original barrel re-exports

**Files created:**
- `src/pages/CalendarPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/PersonalTodosPage.tsx`
- `src/pages/AdminPanel.tsx` (note: overwrites existing if present)
- `src/hooks/usePersonalTodos.ts`

**Files modified:**
- `src/types/index.ts` — appended L10/EOS type interfaces (preserved all existing re-exports)

**Build status:** PASSES (✓ Vercel deployment READY, commit 7bb7e98)
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking (baseline ~501 as of 2026-02-18)
- `customer_price_lists` RLS uses `USING (true)` — pre-existing, not changed this session
- Rosin lab DB tables do not exist yet; service uses `as any` cast and returns empty defaults
- L10/EOS Supabase tables (plans, goals, rocks, scorecard_metrics, meetings, etc.) need to be created via migration
- New pages not yet wired into router (App.tsx routes not updated this session)

**Next steps:**
- Wire new pages into App.tsx router (routes for /calendar, /todos, /admin, /dashboard)
- Create Supabase migrations for L10/EOS tables (plans, goals, rocks, scorecard_metrics, scorecard_entries, meetings, issues, todos, checkins, personal_todos, personal_todo_completions, claude_recommendations)
- Add RLS policies for L10/EOS tables
- Rosin Lab Prompt #2: Fresh Frozen intake form + storage table

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
