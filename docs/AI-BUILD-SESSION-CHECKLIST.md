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
**Session:** CRM Phase 4 — Dashboard Quick Actions, Sparklines & Pinned Notes
**Status:** COMPLETE

**What was done:**

Implemented all three features of CRM Phase 4: dashboard quick actions with at-risk inline actions, revenue trend sparklines, and account pinned notes.

**1. Dashboard Quick Actions (Feature 4A)**
- `DashboardQuickActions.tsx` (new) — Three action buttons: New Order, Log Activity, Schedule Visit
- `CRMDashboard.tsx` — Added `onCreateOrder` prop, renders DashboardQuickActions between stats and top accounts
- `AtRiskAccounts.tsx` — Inline action buttons on hover: Phone (tel: link), Calendar (schedule visit), ShoppingCart (create order)
- `App.tsx` — Passes `onCreateOrder` callback to CRMDashboard

**2. Revenue Trend Sparklines (Feature 4B)**
- `RevenueSparkline.tsx` (new, shared) — Pure SVG sparkline with polyline + gradient fill, color-coded by trend direction
- `crm.service.ts` — `getBatchMonthlyRevenue(accountIds)` fetches 6 months of revenue in one query using `.in()`
- `useCRMDashboard.ts` — Fetches monthlyRevenueMap for top 15 accounts, returns it for TopAccountsTable
- `TopAccountsTable.tsx` — New "Trend" column with sparklines (hidden on small screens)
- `useAccountDeepDive.ts` — Fetches monthlyRevenue for individual account
- `AccountDetail.tsx` — Passes monthlyRevenue to AccountHeader
- `AccountHeader.tsx` — Shows "6-Month Revenue Trend" sparkline card above metrics grid

**3. Account Pinned Notes (Feature 4C)**
- Migration: `add_pinned_column_to_activity_log` — adds `pinned` boolean (default false) + partial index
- `crm.types.ts` — Added `pinned` field to `CustomerActivity` interface
- `crm.service.ts` — `getPinnedNotes(customerId)`, `togglePinActivity(activityId, pinned)`
- `AccountPinnedNotes.tsx` (new) — Pinned notes panel with amber theme, unpin on hover
- `AccountActivityLog.tsx` — Pin/unpin toggle button on each activity row, pin indicator badge
- `AccountDetail.tsx` — AccountPinnedNotes placed above AccountContacts in sidebar

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customer_price_lists` RLS uses `USING (true)` — pre-existing, not changed this session

**Next recommendations (in order):**
1. **Sales rep performance dashboard** — Per-rep metrics, deal tracking, quota progress
2. **Export/reporting capabilities** — Account data export, revenue reports
3. **Cultivation: Move to Group action** — plant-level workflow with strain validation
6. **Cultivation: Move to Room action** — split plants into new group in different room

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
