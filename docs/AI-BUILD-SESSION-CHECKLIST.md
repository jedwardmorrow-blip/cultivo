---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-25
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-25
**Session:** CRM Phase 2 — Sales Activity Management (tasks, visits, health scoring, product deep-dive)
**Status:** COMPLETE

**What was done:**

Implemented the full CRM Phase 2 Sales Activity Management system: task queue, visit calendar with drag-and-drop, account health scoring, product mix deep-dive, and delivery history — covering documentation, database, services, hooks, and UI components.

**1. Documentation updates (docs-first approach)**
- `docs/CRM.md` — Added Phase 2 specification: crm_tasks/crm_visit_schedule table specs, lifecycle diagrams, scoring formula, frontend architecture, design decisions #6-9
- `docs/CRM-INTEGRATION-MAP.md` — Added Phase 2 tables, views, service queries, types, and navigation entries
- `docs/ARCHITECTURE-DECISIONS.md` — Added ADR #14 (auto-logging pattern), #15 (health scores as VIEW), #16 (visit calendar pattern)
- `docs/AI-SESSION-BRIEF.md` — Updated version to 2.3, dates, session list, CRM reference

**2. Database migration (create_crm_sales_activity_system)**
- Created `crm_tasks` table with CHECK constraints, RLS (4 policies), 5 indexes
- Created `crm_visit_schedule` table with CHECK constraints, RLS (4 policies), 4 indexes
- Added `linked_task_id` and `visit_id` FK columns to `customer_activity_log`
- Created `fn_update_updated_at_column()` trigger for both tables
- Created `crm_account_scores` VIEW (health scoring: recency 40%, frequency 25%, revenue 20%, engagement 15%)
- Created `crm_product_mix_by_customer` VIEW

**3. Type definitions**
- Extended `crm.types.ts` with TaskType, TaskPriority, TaskStatus, CRMTask, CRMTaskInput, VisitType, VisitStatus, VisitSchedule, VisitScheduleInput, AccountHealthScore, CustomerProductMix

**4. Service layer (3 new files)**
- `tasks.service.ts` — getTasks, getOpenTasks, createTask, completeTask (auto-logging), snoozeTask, cancelTask
- `visits.service.ts` — getVisits, getVisitsForMonth, scheduleVisit, completeVisit (auto-logging), rescheduleVisit, cancelVisit
- `deepDive.service.ts` — getAccountHealthScores, getAccountHealthById, getCustomerProductMix, getCustomerDeliveryHistory

**5. Hooks (4 new files)**
- `useSalesQueue.ts` — Tasks + visits with overdue/today/upcoming categories, real-time subscriptions
- `useVisitCalendar.ts` — Monthly visit data grouped by date, month navigation, real-time subscriptions
- `useAccountDeepDive.ts` — Parallel load of health score, product mix, delivery history
- `useTaskManager.ts` — Task CRUD with filters and real-time subscriptions

**6. Components (7 new files + 2 enhanced)**
- `SalesQueue.tsx` — Daily action center with overdue/today/week sections, task/visit actions
- `TaskCreateModal.tsx` — Modal form for creating tasks
- `VisitCalendar.tsx` — Monthly calendar with drag-and-drop visit rescheduling
- `VisitScheduleModal.tsx` — Modal form for scheduling visits
- `AccountProductMix.tsx` — Product deep-dive with revenue share bars
- `AccountDeliveryHistory.tsx` — Delivery timeline with status badges
- `AccountHealthBadge.tsx` — Health score pill (sm/md sizes)
- Enhanced `AccountDetail.tsx` — Added tabbed view (Orders/Product Mix/Deliveries), health badge integration
- Enhanced `AccountHeader.tsx` — Health score badge in header

**7. Navigation and routing**
- Added `crm-queue` and `crm-visit-calendar` to sectionNavigation.ts
- Added lazy imports and renderView cases in App.tsx
- Updated barrel exports in components/index.ts and crm/index.ts

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking

**Next recommendations (in order):**
1. **CRM Phase 3** — Per-customer price list management UI
2. **Revenue trend charts** — requires chart library decision (recharts vs lightweight)
3. **Cultivation: Move to Group action** — plant-level workflow with strain validation
4. **Cultivation: Move to Room action** — split plants into new group in different room

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
