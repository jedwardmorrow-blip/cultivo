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
**Session:** Optimization Phase 1 -- Type System Regeneration
**Status:** COMPLETE

**What was done:**
- Regenerated `database.types.ts` from live DB via SQL introspection (2,586 -> 6,599 lines)
- Added 85 foreign key Relationships across 40 tables for Supabase join type inference
- tsc errors reduced from 1,045 to 500 (52% reduction)
- Fixed PublicMenu.tsx broken logo reference (outline variant -> `cult-logo-white-320.png`)
- Created `scripts/gen-types.mjs` for future type regeneration without access token

**Build status:** Passes clean (2411 modules, 26s)

**Known issues:** 500 remaining tsc errors (real code issues, not stale types). Top offenders:
- `combine.service.ts` (73 errors) -- references non-existent `product_id` column on `inventory_items`
- `manifestService.ts` (34), `invoiceService.ts` (30) -- type mismatches
- `conversions.service.ts` (25), `AuditManagement.tsx` (25)

**New files:** `scripts/gen-types.mjs`, `scripts/tables-data.json`, `scripts/views-data.json`
**Modified files:** `src/lib/database/database.types.ts`, `src/pages/public/PublicMenu.tsx`
**Migrations:** None

**Critical context for future sessions:**
- `database.types.ts` was regenerated via `scripts/gen-types.mjs` (SQL introspection, no access token)
- The `Relationships` arrays enable join type inference -- do NOT revert to empty arrays
- Remaining 500 tsc errors are real code bugs, tracked for Phase 3 in `docs/OPTIMIZATION-ROADMAP.md`
- All previous critical context still applies (cancel functions, undo guards, COA sync, etc.)

**Next recommendations (follow OPTIMIZATION-ROADMAP.md):**
1. Phase 2: Extract hardcoded license numbers and stage UUIDs to app_settings
2. Phase 3: Fix duplicate type definitions and double-casts
3. Phase 4: Consolidate 3 duplicate order services
4. Phase 5: Bundle size optimization (code splitting)

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
- [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) - Phased optimization plan (type safety, bundle, cleanup)

**Modules:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [ANALYTICS.md](./ANALYTICS.md) | [RECONCILIATION.md](./RECONCILIATION.md)

**UI:** [UI-PATTERNS.md](./UI-PATTERNS.md) | [UI-COMPONENTS-REFERENCE.md](./UI-COMPONENTS-REFERENCE.md)
