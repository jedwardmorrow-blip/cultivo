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
**Session:** Optimization Phase 2 -- Hardcoded Values Extraction
**Status:** COMPLETE

**What was done:**
- Extracted 12 hardcoded license/company string occurrences to shared constants in `src/lib/constants/index.ts`
- Created shared `getCompanySettings()` utility in `src/lib/constants/companySettings.ts`
- Removed 2 duplicate `getCompanySettings()` functions from `invoiceService.ts` and `manifestService.ts`
- Replaced 5 hardcoded stage UUIDs in `conversions.service.ts` with cached `product_stages` DB lookup
- `getProductStageIdFromProductName()` is now async (both internal call sites updated)

**Build status:** Passes clean (2413 modules, 24s)

**Known issues:** 500 remaining tsc errors (unchanged from Phase 1 -- real code issues tracked for Phase 3)

**New files:** `src/lib/constants/companySettings.ts`
**Modified files:**
- `src/lib/constants/index.ts` -- added compliance constants + re-export
- `src/features/orders/components/coversheet/ComplianceHeader.tsx` -- imports shared constants
- `src/features/orders/components/coversheet/BatchComplianceTable.tsx` -- imports shared constants
- `src/features/orders/components/LabelGenerator.tsx` -- imports shared constants
- `src/features/orders/components/LabelPrintPreview.tsx` -- removed local constants, imports shared
- `src/features/orders/services/invoiceService.ts` -- removed local getCompanySettings, imports shared
- `src/features/orders/services/manifestService.ts` -- removed local getCompanySettings, imports shared
- `src/features/orders/services/coversheet.service.ts` -- imports shared constants for fallbacks
- `src/features/orders/services/labelAutoFill.service.ts` -- imports shared constants
- `src/features/inventory/services/conversions.service.ts` -- async stage lookup with cache
**Migrations:** None

**Critical context for future sessions:**
- `getProductStageIdFromProductName()` is now async -- any new callers must await it
- Stage ID cache (`stageIdCache`) lives in module scope, reset on page reload
- Compliance fallback constants live in `src/lib/constants/index.ts` -- single source of truth
- All previous critical context still applies (cancel functions, undo guards, COA sync, etc.)

**Next recommendations (follow OPTIMIZATION-ROADMAP.md):**
1. Phase 3: Fix duplicate type definitions and double-casts
2. Phase 4: Consolidate 3 duplicate order services
3. Phase 5: Bundle size optimization (code splitting)

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
