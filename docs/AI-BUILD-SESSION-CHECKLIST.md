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

**Date:** 2026-03-01
**Session:** Package Assignment Reservation System
**Status:** COMPLETE

**What was done:**

Implemented trigger-based inventory reservation on package assignments. Removed the entire legacy allocation system. Inventory is now automatically reserved when packages are assigned and permanently deducted when orders complete.

**1. Legacy allocation removal** (migration: `remove_legacy_allocation_system`)
- Dropped `order_item_allocations` table, `inventory_transactions` table
- Dropped 10 legacy functions and 4 legacy triggers
- Simplified `validate_ready_for_delivery` function

**2. Package assignment reservation triggers** (migration: `add_package_assignment_reservation_system`)
- Added `status` column to `package_assignments` ('reserved' | 'fulfilled' | 'released')
- `fn_reserve_inventory_on_assignment` — AFTER INSERT, reserves inventory (available_qty--, reserved_qty++), creates RESERVE movement
- `fn_release_inventory_on_unassignment` — BEFORE DELETE, releases reservation if status='reserved'

**3. Inventory reservation views** (migration: `create_inventory_reservation_views`)
- `inventory_reservation_summary` — per-item reservation aggregation
- `package_assignments_with_reservations` — extended assignment details with inventory context

**4. Order fulfillment triggers** (migration: `create_order_fulfillment_triggers`)
- `fn_fulfill_inventory_on_order_complete` — on status->'completed': releases reservation, creates FULFILLMENT movement, status='fulfilled'
- `fn_release_inventory_on_order_cancel` — on status->'cancelled': releases all reservations
- `fn_reverse_fulfillment_on_order_revert` — on status leaves 'completed': creates RETURN movement, re-reserves

**5. Invoice & Manifest service migration** (modified)
- `invoiceService.ts` — Replaced `order_item_allocations` query with `package_assignments`
- `manifestService.ts` — Same pattern of migration

**6. Type & service updates** (modified)
- Removed `Allocation` interface from `order.types.ts`, added `PackageAssignmentStatus`
- Updated `packageAssignment.service.ts` — status field, fulfilled guard, filtered queries
- Fixed `fulfillmentValidation.service.ts` — corrected column names to match actual views

**7. UI reservation visibility** (modified)
- `AssignedPackagesDisplay.tsx` — Status badges (Reserved/Fulfilled), fulfilled items cannot be removed
- `StatusActionPanel.tsx` — Updated hints for completion and cancellation inventory effects

**Build status:** PASSES
**Known issues (carry-forward, unchanged):**
- Pre-existing tsc errors — not blocking
- `customer_price_lists` RLS uses `USING (true)` — pre-existing, not changed this session

**Next recommendations (in order):**
1. **Sales rep performance dashboard** — Per-rep metrics, deal tracking, quota progress
2. **Export/reporting capabilities** — Account data export, revenue reports
3. **Cultivation: Move to Group action** — plant-level workflow with strain validation
4. **RLS anon policy removal** — Remove legacy anon policies from pre-auth tables

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
