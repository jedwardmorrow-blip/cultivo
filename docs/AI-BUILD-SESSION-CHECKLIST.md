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

**Date:** 2026-02-17
**Session:** Invoice THC Percentage Fix
**Status:** COMPLETE

**What was done:**
- Fixed invoice THC showing "--" for batches with active COAs (e.g., Black Maple 251105-BLM with THC 25.04%)
- Root cause: `invoiceService.ts` joined COA via legacy `batch_registry.coa_id` field which was null for post-backfill COAs
- Changed invoice service to query `certificates_of_analysis` directly via canonical `batch_id` FK with `is_active = true` filter
- Added bidirectional sync in `createCOA()` to set `batch_registry.coa_id` after creating active COAs

**Build status:** Passes (pre-existing EAGAIN on public asset copy)

**Known issues:** Pre-existing EAGAIN error when copying `Cult Cannabis Co Final White 320x320@3x.png` to dist (filename with spaces)

**New files:** None
**Modified files:** invoiceService.ts (COA query direction fix), coa.service.ts (bidirectional coa_id sync)
**Migrations:** None

**Critical context for future sessions:**
- Invoice service now uses canonical `certificates_of_analysis.batch_id` direction per COA-HANDLING.md GAP-009
- `createCOA()` now syncs `batch_registry.coa_id` for bidirectional consistency
- The `pending_conversion_sessions` VIEW uses `?|` JSONB operator -- do NOT replace with LEFT JOIN
- `reason_code: 'session_finalization'` in conversion service is REQUIRED (Architecture Decision #1)

**Next recommendations:**
1. Consider renaming public asset files to remove spaces (prevents EAGAIN build errors)
2. Console.log cleanup (103 instances across 22 files -- deferred)
3. Audit other queries that may still use legacy `batch_registry.coa_id` join direction

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
