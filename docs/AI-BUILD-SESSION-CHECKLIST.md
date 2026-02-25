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
**Session:** CRM Phase 2.5 — Chain Hierarchy & Delivery Model
**Status:** COMPLETE

**What was done:**

Implemented CRM Phase 2.5: per-child-location performance analytics, delivery model tracking, expand/collapse chain hierarchy in accounts list, and combined chain revenue across all dashboard components.

**1. Database migration (add_chain_hierarchy_and_delivery_model)**
- Added `delivery_model` column to `customers` (text NOT NULL DEFAULT 'direct_to_each', CHECK constraint)
- Created `crm_chain_location_performance` VIEW with CTE-based revenue share calculation
- DROP+recreated `crm_customer_summary` VIEW with `delivery_model`, `child_total_revenue`, `child_total_orders`

**2. Type definitions**
- Added `DeliveryModel`, `ChainHealthLabel`, `ChainLocationPerformance` types to `crm.types.ts`
- Extended `AccountSummary` with `delivery_model`, `child_total_revenue`, `child_total_orders`

**3. Service layer**
- Added `getChainLocationPerformance()` and `updateDeliveryModel()` to `crm.service.ts`

**4. Hooks**
- `useAccountDetail.ts` — Added `chainPerformance` state, parallel fetch with child accounts
- `useCRMDashboard.ts` — Filter hub_child from top/at-risk lists, sort by combined revenue

**5. Components (6 enhanced)**
- `SubAccountsPanel.tsx` — Full rewrite: health badges per child, revenue share bars, top performer, delivery model badge
- `AccountDetail.tsx` — Pass chainPerformance and deliveryModel to SubAccountsPanel
- `AccountsList.tsx` — Full rewrite: expand/collapse chain rows, child grouping, search bubbling, combined revenue sort
- `AccountHeader.tsx` — Full rewrite: delivery model badges (Package/Truck icons), chain-level metrics for hub parents
- `TopAccountsTable.tsx` — Full rewrite: combined chain revenue, CHAIN badge
- `AtRiskAccounts.tsx` — Full rewrite: combined chain revenue, CHAIN badge

**6. Documentation**
- `docs/CRM-SUB-ACCOUNTS.md` — Delivery model section, chain performance view schema, UI implementation details
- `docs/CRM.md` — Phase 2.5 section, delivery_model column, crm_chain_location_performance view, design decisions #10-11
- `docs/CRM-INTEGRATION-MAP.md` — Phase 2.5 view, service queries, types
- `docs/ARCHITECTURE-DECISIONS.md` — ADR #17 (delivery model and chain performance as view-based analytics)
- `CHANGELOG.md` — Phase 2.5 entry

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
