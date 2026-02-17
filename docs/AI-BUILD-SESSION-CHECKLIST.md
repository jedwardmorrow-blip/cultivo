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
**Session:** System Health Remediation
**Status:** COMPLETE

**What was done:**
- Deleted 3 dead hook files (useOrders.ts, useOrdersWithDetails.ts, useSettings.ts) and fixed barrel exports
- Removed 2 dead functions (getRemainingQuantity from conversions.service.ts, assignCOAToBatch from batch.service.ts)
- Fixed all 65 TS6133 unused variable warnings across 48 files
- Replaced all 60 browser alert() calls with notificationService across 21 files
- Stripped ~170 console.log/warn/info/debug statements across 25 files
- Removed unused npm packages (dom-to-image-more, @types/react-router-dom)
- Renamed PNG files with spaces to fix EAGAIN build errors (cult-logo-white-320.png, cult-logo-eye.png)
- Updated all image references in source files and index.html

**Build status:** Passes clean (2411 modules, no EAGAIN errors)

**Known issues:** None introduced. Pre-existing ~1000 TS errors from stale database.types.ts (needs CLI type regeneration).

**New files:** None (renamed existing PNGs)
**Modified files:** ~50 files across all feature modules
**Migrations:** None

**Critical context for future sessions:**
- All browser alerts now use notificationService (.warning/.error/.success/.info)
- PNG logos renamed: `/cult-logo-white-320.png` (main), `/cult-logo-eye.png` (favicon)
- PublicMenu.tsx references `/Cult Cannabis Co Final White Outline 320x320@3x.png` which does not exist (pre-existing issue)
- The `pending_conversion_sessions` VIEW uses `?|` JSONB operator -- do NOT replace with LEFT JOIN
- `reason_code: 'session_finalization'` in conversion service is REQUIRED (Architecture Decision #1)

**Next recommendations:**
1. Regenerate database.types.ts from live schema (needs Supabase CLI)
2. Fix PublicMenu.tsx broken logo reference (outline variant PNG is missing)
3. Extract hardcoded license/company details to app_settings (Phase 5.2 deferred)
4. Extract hardcoded product stage UUIDs to DB lookup (Phase 5.3 deferred)

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
