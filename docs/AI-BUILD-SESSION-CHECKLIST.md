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
**Session:** Partial Conversion Support Fix
**Status:** ✅ Complete

**What was done:**
- Fixed bug where partially converting a conversion bucket (e.g., creating a 400g bag from 1700g output) caused the remaining output to disappear from the conversions view
- Root cause: the `finalize_session_aggregated` RPC was called unconditionally, marking ALL sessions as finalized even when only a fraction of the output was packaged
- Added conditional finalization logic to `conversions.service.ts` -- the RPC is now only called when packages account for all remaining weight (with 0.5g tolerance)
- Fixed `source_session_ids` for partial packages to reference only one session, preventing double-counting in the VIEW's LEFT JOIN
- Repaired two SWF bucking sessions (87e1699f, a40765a9) that were incorrectly marked as finalized
- Added Architecture Decision #9 documenting partial conversion support rules

**Build status:** ✅ Passes

**Known issues:** Pre-existing EAGAIN error when copying `Cult Cannabis Co Final White 320x320@3x.png` to dist (filename with spaces)

**New files:** None
**Modified files:** conversions.service.ts, useFinalizationWorkflow.ts, ConversionModal.tsx, ARCHITECTURE-DECISIONS.md
**Migration:** repair_swf_partial_finalization_status

**Architecture decision added:** #9 (Partial Conversion Support) -- future sessions MUST read this before touching the finalization flow. The conditional RPC call in conversions.service.ts is INTENTIONAL, not a bug.

**Next recommendations:**
1. Session 195fdd62 (600g output, 200g packaged, marked finalized from 2026-01-21) may also need the same repair -- user should verify
2. Test partial conversion workflow: create bags for part of a bucket, verify remaining shows correctly, then finalize the rest
3. Consider renaming public asset files to remove spaces (prevents EAGAIN build errors)

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
