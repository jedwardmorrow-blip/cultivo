---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-26
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-26
**Session:** Enable Realtime Subscriptions & Fix Stale Data
**Status:** COMPLETE

**What was done:**

Fixed stale data across the entire application. The root cause: no tables were published to the `supabase_realtime` publication, so all 14 frontend realtime subscriptions were silently receiving zero events.

**1. Database Migration**
- `enable_realtime_publication_for_subscribed_tables` — Added 10 tables to `supabase_realtime`: `inventory_items`, `orders`, `order_items`, `conversion_packages`, `batch_registry`, `trim_sessions`, `bucking_sessions`, `packaging_sessions`, `crm_tasks`, `crm_visit_schedule`
- Uses exception-safe loop with `IF NOT EXISTS`-style error handling

**2. Inventory Grade Refresh**
- `InventoryViews.tsx` — `GradeColumn()` now accepts optional `onDataRefresh` callback; calls it after successful grade assignment
- `AllInventoryView.tsx` — Inline grade column also calls `onDataRefresh` after assignment
- `InventoryViewsSimplified.tsx` — All 5 view wrappers thread `fetchInventory(true)` from context as `onDataRefresh` prop
- View component props (`BinnedViewProps`, `BuckedViewProps`, `BulkViewProps`, `PackagedViewProps`, `AllInventoryViewProps`) extended with optional `onDataRefresh`

**3. Orders Refresh**
- `App.tsx` — Added `ordersRefreshKey` state counter. `handleOrderCreated` increments it. `OrdersContainer` receives it as `key`, forcing remount and fresh data load.

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customer_price_lists` RLS uses `USING (true)` — pre-existing, not changed this session

**Next recommendations (in order):**
1. **Sales rep performance dashboard** — Per-rep metrics, deal tracking, quota progress
2. **Export/reporting capabilities** — Account data export, revenue reports
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
