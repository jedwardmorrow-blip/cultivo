---
title: AI Build Session Checklist
category: AI Development
updated: 2026-02-17
priority: Working document - update every session
---

# AI Build Session Checklist

> **Purpose:** Lean handoff document. Update the Hand-Off section at the end of every session.
> **Rule:** Keep this file under 200 lines. Move completed session details to `docs/archive/sessions/`.

---

## Hand-Off from Last Session

**Date:** 2026-02-17
**Session:** Production Bug Fixes and Architecture Gap Remediation
**Status:** COMPLETE

**What was done:**
- Fixed cancel session bug: all 3 cancel functions (trim, bucking, packaging) were setting `completed_at` instead of `cancelled_at`
- Added missing `errorService` import to `conversions.service.ts` (would crash at runtime on ATP violation)
- Added `batch_id` lookup to `addPackageToAudit()` so audit-created inventory items have proper batch UUID
- Completed COA bidirectional sync: `updateCOA()` and `deleteCOA()` now sync `batch_registry.coa_id`
- Added finalization guard to `undoCompletedSession()` -- blocks undo if conversion packages exist
- Fixed lifecycle order in docs (Buck before Trim), updated movement kinds to canonical 9
- Updated dates, session list, and known deferred items across CLAUDE.md and AI-SESSION-BRIEF.md
- Fixed dead PRODUCTS.md references to PRODUCTS.md

**Build status:** Passes clean (2411 modules)

**Known issues:** None introduced. Pre-existing ~1000 TS errors from stale database.types.ts (needs CLI type regeneration).

**New files:** None
**Modified files:** 7 source files + 4 documentation files
**Migrations:** None

**Critical context for future sessions:**
- Cancel functions now set `cancelled_at` (not `completed_at`) -- do not regress
- `undoCompletedSession()` checks `conversion_packages.source_session_ids` before allowing undo
- COA create/update/delete all sync `batch_registry.coa_id` -- keep this pattern
- The `pending_conversion_sessions` VIEW uses `?|` JSONB operator -- do NOT replace with LEFT JOIN
- `reason_code: 'session_finalization'` in conversion service is REQUIRED (Architecture Decision #1)

**Next recommendations:**
1. Regenerate database.types.ts from live schema (needs Supabase CLI)
2. Fix PublicMenu.tsx broken logo reference (outline variant PNG is missing)
3. Consolidate duplicate order services (ordersService, orders-data, orders-cache)
4. Extract hardcoded license/company details to app_settings (Phase 5.2 deferred)
5. Extract hardcoded product stage UUIDs to DB lookup (Phase 5.3 deferred)

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

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
