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

**Date:** 2026-04-11 — Plant Audit UI Phase A (baseline reset tool)
**Status:** ✅ COMPLETE — typecheck clean, build passing, ready for Sunday 2026-04-12 walk

**What was done:**

Shipped the full Plant Audit surface under `src/features/cultivation/components/plant-audit/`:

1. **Service:** `plantAudit.service.ts` — session CRUD via `fn_generate_plant_audit_number` → insert → pre-seed one `plant_audit_counts` row per active plant_group in scope. `recordPlantAuditCount` computes variance client-side (`physical - db_snapshot`), sets cause_of_death only on negative deltas. Orphan path creates `plant_groups` row first with true count, then audit count row flagged `is_orphan=true`. `applyPlantAudit` calls `fn_apply_plant_audit` RPC.
2. **Hook:** `usePlantAudit` — sessions list + active session with counts + all action methods. Local patch on count updates avoids full reload.
3. **Types:** appended at `cultivation.types.ts:681` — `PlantAuditSession`, `PlantAuditCount` (with room_tables/room_sections join), `PlantAuditSummary`, `StartPlantAuditInput`, `RecordPlantAuditCountInput`, `CreateOrphanPlantGroupInput`.
4. **UI:** `PlantAuditPage` state machine (hub ↔ counting ↔ review ↔ applied), `PlantAuditHub`, `PlantAuditSetupModal`, `PlantAuditCountScreen` (room-layout mirror: groups counts by room → table → section using the join payload, no parallel layout fetch), `AuditGroupRow` (per-count entry with live variance + cause_of_death selector + not-found form + skip/reset), `PlantAuditOrphanModal` (dedicated walk-time capture, constrained strain picker), `PlantAuditReviewScreen` (per-room breakdown + totals), `PlantAuditApplyDialog` (destructive confirm with abandon sub-flow).
5. **Wiring:** barrel spreads `plantAuditService` into `cultivationService`; `hooks/index.ts` exports `usePlantAudit`; `components/index.ts` exports `PlantAuditPage`; `App.tsx` registers `/cultivation-plant-audit` with `lazyRetry` + `CultivationErrorBoundary`; `sectionNavigation.ts` adds `{ id: 'cultivation-plant-audit', icon: ClipboardList, group: 'secondary' }` in Cultivation section.

**Design system:** liquid glass throughout (`glass-modal`, `glass-card`, `glass-input`, `rounded-cult` containers, `rounded-xl` buttons), semantic tokens only (`cult-accent`, `cult-danger`, `cult-success`, `cult-info`, `cult-warning`, `cult-pending`), status-driven shell tinting on `AuditGroupRow`.

**Sunday 2026-04-12 use cases covered:**
- Baseline reset: start audit → pre-seeded counts populated from current plant_groups → walk room by room → confirm/correct each group → review → apply (negatives become mortality log entries, positives increment plant_count, orphans are pure evidence).
- Add plants to existing group: enter `physical_count > db_count_snapshot` → `variance_noted` with positive delta → `fn_apply_plant_audit` increments `plant_groups.plant_count`.
- Capture plants with no system record: "Orphan" button on room panel → `PlantAuditOrphanModal` → creates plant_group + evidence audit line.

**Build status:** ✅ `npx tsc --noEmit` clean, `npm run build` passing (10.36s)

**Known limitations (deferred to Phase B):**
- Quick-add list mode for orphans (batch entry)
- `GREATEST(plant_count - x, 0)` safety net on mortality trigger
- Inventory Audit UI rewrite

**Follow-ups:** none blocking. Walk-ready for Sunday.

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
