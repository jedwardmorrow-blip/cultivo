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
**Session:** CRM Phase 3 — Order Integration & Price List Management
**Status:** COMPLETE

**What was done:**

Implemented CRM Phase 3: create orders directly from account detail pages with pre-selected dispensary, customer price list management UI, and soft price integration in order form.

**1. Order creation from Account Detail**
- `App.tsx` — Added `preSelectedCustomerId` state, `handleCreateOrderForCustomer()` handler, CRM activity auto-logging in `handleOrderCreated()`
- `NewOrderForm.tsx` — New `preSelectedCustomerId` prop, auto-selects and locks dispensary dropdown, loads customer price overrides, applies custom prices on product selection with "Custom" badge
- `AccountDetail.tsx` — Added `onCreateOrder` prop, passes to AccountHeader
- `AccountHeader.tsx` — New "New Order" button (ShoppingCart icon) in header right section

**2. Customer price list management**
- `priceList.service.ts` (new) — Full CRUD: `getCustomerPriceList()`, `getActivePricesForCustomer()`, `getActivePriceForProduct()`, `createPriceOverride()`, `updatePriceOverride()`, `deletePriceOverride()`
- `AccountPriceList.tsx` (new) — Price override management with active/scheduled/expired grouping, product search, discount % display, inline add form
- `AccountDetail.tsx` — Added "Pricing" tab to TABS array

**3. Price integration in order form**
- `NewOrderForm.tsx` — When `preSelectedCustomerId` is set, fetches customer's active price overrides. On product select, uses custom price if available, falls back to standard price. Shows "Custom" label on unit price field.

**4. CRM activity auto-logging**
- `App.tsx` imports `createActivity` from CRM service. On successful order creation from account view, auto-logs a "note" activity with order number.

**5. Types**
- `crm.types.ts` — Extended `CustomerPriceOverride` with `standard_price` field

**6. Documentation**
- `docs/CRM.md` — Phase 3 marked Complete, Phase 4 (Future) documented
- `CHANGELOG.md` — Phase 3 entry
- `docs/AI-BUILD-SESSION-CHECKLIST.md` — This hand-off

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customer_price_lists` RLS uses `USING (true)` — pre-existing, not changed this session

**Next recommendations (in order):**
1. **CRM Phase 4: Dashboard Quick Actions** — New Order / Log Activity / Schedule Visit buttons on CRM Dashboard, inline actions on At-Risk accounts. Pure UI, no database changes.
2. **CRM Phase 4: Revenue Trend Sparklines** — Pure SVG sparklines in TopAccountsTable and AccountHeader. New service function for batched monthly revenue. No database changes.
3. **CRM Phase 4: Account Pinned Notes** — Add `pinned` boolean to `customer_activity_log` or create `customer_notes` table. Pin/unpin toggle on activity log entries. Requires migration.
4. **Revenue trend charts** — requires chart library decision (recharts vs lightweight SVG)
5. **Cultivation: Move to Group action** — plant-level workflow with strain validation
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
