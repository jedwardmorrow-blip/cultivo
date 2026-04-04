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

**Date:** 2026-04-08 (Dual Track: CFO Planning + QA Validation)
**Sessions:**
- [CUL-375](/CUL/issues/CUL-375): Arroya Cash Flow Modeling & Runway Integration (COMPLETE)
- [CUL-372](/CUL/issues/CUL-372): Arroya Financial Contract Terms & Payment Schedule (COMPLETE)
- **[CUL-551](/CUL/issues/CUL-551): Order Entry Soft Reservation (QA VALIDATION COMPLETE)**
**Status:** All tasks complete; Arroya board decision needed TODAY; CUL-551 findings ready for Paperclip posting

**What was done (Session 3 - April 8 via Paperclip):**

Completed financial planning phase for Arroya partnership. All board-ready documents committed and accessible:

1. ✅ **`docs/ARROYA-CASH-FLOW-MODEL.md`** (550+ lines): Monthly cash flow detail, three scenario analysis (conservative $14K, base $29.5K, aggressive $46K Y1 net impact), runway bridge (13.9→20–30 months with Arroya), decision gates
2. ✅ **`docs/ARROYA-CONTRACT-TERMS-SCHEDULE.md`** (480+ lines): Revenue share mechanics (three options: tiered 15→12→10%, fixed 12%, performance 10%+2% bonus), payment schedule, MDF governance ($20K Y1), termination terms, legal schedules
3. ✅ **`docs/ARROYA-BOARD-DECISION-SUMMARY.md`** (NEW - 136 lines): Board-ready decision package with three revenue share options, financial impact summary, timeline, recommendation (Option A tiered)
4. ✅ **`docs/FINANCIAL-MODEL-ARROYA-PITCH.md`** (584 lines): Overall financial strategy, SaaS pricing, 3-year projections, unit economics, capital structure, AI agent budget framework

**CFO Priorities Completed:**
- ✅ **AI Agent Budget Controls Framework** ($80K/yr cap with quarterly review gates)
- ✅ **SaaS Pricing Model** (3-tier model: $4K–$10K/month SaaS + $25K services + upsells)
- ✅ **Development Costs** integrated into 3-year projections
- ✅ **Cash Flow Modeling** with Arroya scenarios (Year 1 extends runway 6–10 months)
- ✅ **Contract Terms & Payment Schedule** ready for CRO negotiation
- ✅ **Board Decision Package** with three revenue share options + recommendation

**Build status:** Not applicable (financial planning)
**Key Files (All Committed):**
- `docs/FINANCIAL-MODEL-ARROYA-PITCH.md` (584 lines)
- `docs/ARROYA-CASH-FLOW-MODEL.md` (550+ lines)
- `docs/ARROYA-CONTRACT-TERMS-SCHEDULE.md` (480+ lines)
- `docs/ARROYA-BOARD-DECISION-SUMMARY.md` (136 lines, NEW)

**Known dependencies (Critical Path to Series A):**
- ⏳ **Board decision on revenue share tier (A/B/C) — DUE TODAY April 8** (CEO approves + signs off)
- ⏳ CRO kicks off Arroya negotiation April 9–12 (payment terms, revenue thresholds, territories)
- ⏳ Finance implements QB + billing setup by April 12 (monthly reconciliation automation)
- ⏳ Legal counsel reviews contract + CEO signature (April 20–25)
- ⏳ Target contract execution: April 30, 2026 (pre-Series A pitch)

---

## QA Validation: CUL-551 Order Entry Soft Reservation

**Status:** ✅ COMPLETE — Code review + test validation completed; findings ready for Paperclip posting

**Build & Test Status:**
- ✅ `npm run build` PASS (6.89s, 0 errors)
- ✅ `npm run test` PASS (675/675 tests, 33 files)
- ✅ TypeScript type safety validated

**Files Reviewed:**
- `supabase/migrations/20260404_cul551_order_entry_soft_reservation.sql` (415 lines)
- `src/hooks/useProductReservations.ts` (94 lines, NEW)
- `src/features/orders/components/NewOrderForm.tsx` (partial, hook integration)
- `src/features/orders/components/StrainCatalog.tsx` (product reservation display)

**Critical Validation Results:**

✅ **Inventory Integrity**: All quantity updates use `set_config('app.allow_quantity_update', 'true')` authorization pattern (matches CUL-301 precedent)

✅ **Double-Count Prevention**: Soft holds are released BEFORE hard package assignment (verified at `fn_reserve_inventory_on_assignment()` lines 319-322)

✅ **Lifecycle Management**: Complete trigger-based lifecycle (INSERT on order entry, DELETE on order_item delete, UPDATE on order status change)

✅ **Audit Trail**: All movements logged to `inventory_movements` table with `reason_code` and descriptive notes

**Issues Identified (Ready for Posting):**

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|-----------------|
| **HIGH** | Missing integration tests for soft→hard reservation upgrade | `src/features/orders/` | Add test for order_item INSERT → package_assignment → verify soft hold released before hard reservation applied |
| **MEDIUM** | Order status hardcoded values need validation | Migration line 150 | Verify status enum values ('submitted','accepted','processing','cancelled','completed') match `orders.status` column constraints |
| **MEDIUM** | product_stage_id NULL handling unclear | Migration line 156 | Clarify expected behavior if product.stage_id is NULL (currently logs WARNING and skips reservation) |
| **LOW** | Real-time subscription optimization | Hook line 76-90 | Consider subscribing to `order_item_soft_reservations` table only instead of all `inventory_items` changes |

**Next CFO Priority (Backlog):**
- [CUL-398](/CUL/issues/CUL-398): Financial Forecast Refresh & Runway Modeling — depends on board approval; needed for Series A pitch (April 15 target)

**Remaining Arroya Tasks (Post-Contract):**
- [CUL-373](/CUL/issues/CUL-373): Revenue Recognition Policy (ASC 606) — audit readiness; due May 1
- [CUL-374](/CUL/issues/CUL-374): P&L Structure and Monthly Reporting — partnership governance; due May 1

**Next steps (if board approves April 8):**
1. ⏳ **Today (April 8):** Board approves revenue share tier + CEO authorizes CRO negotiation
2. ⏳ **April 9–12:** CRO negotiation with Arroya legal team
3. ⏳ **April 12:** Finance setup (QB integration, billing automation)
4. ⏳ **April 15:** START CUL-398 (Financial Forecast Refresh with approved tier)
5. ⏳ **April 20–25:** Legal review + final contract signature
6. ⏳ **April 30:** Contract execution with Arroya
7. ⏳ **May 1+:** Implement CUL-373 (ASC 606) + CUL-374 (P&L structure) for audit/partnership governance

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
