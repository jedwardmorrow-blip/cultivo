---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-11
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-16
**Session:** Conversion VIEW Row Multiplication and Audit Trail Fix
**Status:** COMPLETE

**What was done:**
- Fixed `pending_conversion_sessions` VIEW row multiplication bug: LEFT JOIN to `conversion_packages` multiplied session rows when multiple packages matched, inflating remaining quantities (e.g., 1800g shown instead of 900g)
- Replaced LEFT JOIN with correlated scalar subqueries using `source_session_ids ?|` operator for session-scoped package matching -- only packages from pending sessions are subtracted
- Fixed `reason_code` in `conversions.service.ts` from `'finalized_conversion'` to `'session_finalization'` -- the old code caused `chk_atp_consistency` CHECK constraint violations, silently dropping all audit PRODUCE movements
- Repaired session 195fdd62 (SWF, 600g flower, only 200g packaged, incorrectly marked finalized) -- reset to pending, recovering 400g of lost output
- Backfilled missing PRODUCE audit movements for all conversion inventory items (21 items)

**Build status:** Passes

**Known issues:** Pre-existing EAGAIN error when copying `Cult Cannabis Co Final White 320x320@3x.png` to dist (filename with spaces)

**New files:** None
**Modified files:** conversions.service.ts (reason_code fix)
**Migrations:** fix_pending_conversions_view_row_multiplication, fix_pending_conversions_view_session_scoped_packages, repair_session_195fdd62_finalization_status, backfill_missing_produce_movements_for_conversion_items

**Critical context for future sessions:**
- The `pending_conversion_sessions` VIEW uses `?|` JSONB operator to match packages to pending sessions only -- do NOT replace with LEFT JOIN
- `reason_code: 'session_finalization'` in conversion service is REQUIRED -- the trigger bypasses on_hand_qty updates for this code (Architecture Decision #1)
- Partial conversion support (Decision #9) is working: sessions stay pending when only partially packaged

**Next recommendations:**
1. Test full conversion workflow end-to-end: create bags, verify remaining updates, finalize all remaining
2. Consider renaming public asset files to remove spaces (prevents EAGAIN build errors)
3. Console.log cleanup (103 instances across 22 files -- deferred)

---

## Pre-Session Checklist

- [ ] Read [AI-SESSION-BRIEF.md](./AI-SESSION-BRIEF.md)
- [ ] Read [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) if touching inventory/sessions
- [ ] Read [PRODUCT-FLOW.md](./PRODUCT-FLOW.md) if touching conversions
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
- [PRODUCT-FLOW.md](./PRODUCT-FLOW.md) - Canonical product stages and conversions
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - End-to-end workflows
- [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) - Trigger system

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
