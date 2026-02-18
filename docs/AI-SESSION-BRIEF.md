---
title: AI Session Brief
category: AI Development
version: 2.1
updated: 2026-02-18 (C-1 docs + C-2 pre-build)
priority: READ THIS FIRST
---

# AI Session Brief - CULT Seed-to-Sale System

> **Read this first when starting any work session.**
> **Last Updated:** 2026-02-18 (Session C-1: cultivation documentation)
> **Last Migration:** 2026-02-16 (backfill_missing_produce_movements_for_conversion_items)
> **Build Status:** Passing

---

## System Overview (30 seconds)

Cannabis seed-to-sale tracking and production management system.

**Core Architecture:**
- **Batch-centric** - Everything links to batches (YYMMDD-STRAIN format)
- **Event-driven inventory** - Immutable ledger with automatic balance updates
- **Compliance-first** - COA tracking, AZDHS manifests, regulatory fields
- **Full lifecycle** - Grow → Harvest → Buck → Trim → Package → Order → Deliver

**Tech Stack:**
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Tailwind CSS + Lucide React icons
- PDF generation (jsPDF), barcode/QR (jsbarcode, qrcode)
- Leaflet maps for delivery routing

---

## Current State (February 2026)

The system is **feature-complete** and in **production use**. All core workflows are operational:

- Sessions (Trim, Bucking, Packaging) - fully operational
- Conversions (unpivoted by product type, per-product finalization) - working
- Inventory (event-driven ledger, ATP constraint, audit system) - working
- Batches (lifecycle management, COA linkage) - working
- Orders (pipeline, fulfillment, invoicing, manifests) - working
- Customers, Analytics, Settings, Delivery - working

**Last 5 sessions (most recent first):**
1. 2026-02-18: Session C-1 — Cultivation module documentation (CULTIVATION.md, CULTIVATION-ARCHITECTURE.md, CULTIVATION-RULES.md + doc updates)
2. 2026-02-18: Phase C3 — Standardize error return pattern across conversions service layer
3. 2026-02-18: Phase A type hardening + pre-cultivation documentation (phases A, B, C1, C2 also complete)
4. 2026-02-17: Remediation sweep (cancelled_at fix, errorService import, COA sync, undo guard, docs)
5. 2026-02-17: Code quality sweep (dead code, alert replacement, console cleanup, unused imports)

**Known deferred items:**
- **Cultivation module** (Session C-1 complete — docs only): Session C-2 = migrations, Session C-3 = UI
- **Phase D** (testing): see `CULTIVATION-PHASE-D-RISK-ANALYSIS.md` — 244 tests, 177/178 passing as of C-1
- UI/UX polish (command palette, table sorting, CSV export) — not yet scheduled
- See [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) — Phases 1–5 all complete; pre-cultivation phases A–C also complete

---

## Critical Rules

### 1. Never Directly Update Inventory Quantities

Use `inventoryMovementService.recordMovement()` for ALL inventory changes. Database triggers handle balance updates automatically.

```typescript
import { inventoryMovementService } from '@/services/inventoryMovement.service';

await inventoryMovementService.recordMovement({
  movement_kind: 'FULFILLMENT',
  source_item_id: inventoryItemId,
  qty: 100,
  unit: 'g',
  reference_id: orderId,
  reference_type: 'order',
});
```

### 2. Finalization = Creation, Not Movement

Session finalization sets quantities directly on INSERT. Movement records are for audit trail only (trigger bypasses via `reason_code = 'session_finalization'`). See [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md).

### 3. Batch ID is Never Null

Every inventory item must link to a batch. Batch format: `YYMMDD-STRAIN`.

### 4. Centralized Types

Import domain types from `@/types`. Never create duplicate type definitions in feature files.

### 5. Minimal Edit Principle

Search codebase before creating new utilities. Extend existing services. Delete deprecated files immediately.

---

## File Organization

```
src/
  features/          # Feature modules (sessions, inventory, orders, etc.)
    [module]/
      components/    # React components
      hooks/         # Custom hooks
      services/      # Business logic / Supabase queries
      types/         # Feature-specific types (UI state, props)
  types/             # Centralized domain types (Order, Batch, Product, etc.)
  shared/            # Shared components, hooks, services
  lib/               # Core utilities (supabase client, auth, utils)
  services/          # Shared services (inventory movement, error, notification)
docs/                # Documentation (you are here)
supabase/
  migrations/        # Database migrations (chronological)
  functions/         # Edge functions
```

---

## Before You Code

1. Read this document
2. Read the [Hand-Off section](./AI-BUILD-SESSION-CHECKLIST.md) in the checklist
3. If touching inventory/sessions: read [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md)
4. If touching conversions: read [PRODUCTS.md](./PRODUCTS.md)
5. Scan last 3-5 entries in [CHANGELOG.md](../CHANGELOG.md)
6. If doing optimization, cleanup, or type safety work: read [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md)

**Module-specific docs when needed:**
- [BATCHES.md](./BATCHES.md) | [SESSIONS.md](./SESSIONS.md) | [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)
- [ORDERS.md](./ORDERS.md) | [PRODUCTS.md](./PRODUCTS.md) | [CUSTOMERS.md](./CUSTOMERS.md)
- [COA-HANDLING.md](./COA-HANDLING.md) | [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md)

**Cultivation module docs:**
- [CULTIVATION.md](./CULTIVATION.md) - **READ FIRST** — scope, entities, lifecycle, UI screens (v1.2)
- [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md) - Full schema, RLS, triggers, migration plan (v1.2 — live DB verified)
- [CULTIVATION-RULES.md](./CULTIVATION-RULES.md) - Invariants, decisions, error messages, test requirements (v1.2 — invariant C-17 added)

**Before Starting Session C-2 (migrations) — Pre-Build Checklist:**

1. **Verify live DB schema** — run these two queries before writing any SQL:
   ```sql
   -- Confirm strains.abbreviation is nullable (expected: is_nullable='YES')
   SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_name = 'strains' AND column_name = 'abbreviation';

   -- Find active strains with no abbreviation set (must be fixed before ops begin)
   SELECT id, name, abbreviation FROM strains
   WHERE is_active = true AND (abbreviation IS NULL OR abbreviation = '');
   ```

2. **strain_id on batch_registry has NO FK constraint** — the trigger INSERT will succeed but referential integrity is application-enforced only. Do not add a FK constraint in C-2 migrations; document this gap.

3. **initial_weight_grams is nullable in live DB** — trigger INSERT will always succeed. The trigger always passes `NEW.wet_weight_grams` so it will never be null in practice.

4. **Use `strains.name` (not `strains.display_name`)** — when populating `batch_registry.strain` in the trigger. The live schema has both columns; `name` is the correct one for batch records.

5. **Update TypeScript types as FIRST action in C-2** — before migrations, update `src/features/cultivation/types/cultivation.types.ts` to add the 7 missing fields: `group_number`, `mother_plant_group_id`, `is_mother`, `RoomType 'mother'`, `adjusted_weight_grams`, `adjustment_reason`, `PlantGroupRoomHistory`.

6. **Fix `strains.abbreviation` type in shared Strain interface** — `src/types/product.types.ts` likely has `abbreviation: string` — change to `abbreviation: string | null` to reflect live schema.

7. **Five tables in C-2-1, nine trigger pairs in C-2-2** — do not proceed from memory; read CULTIVATION-ARCHITECTURE.md for the exact ordered lists.

**Pre-cultivation preparation docs:**
- [SYSTEM-HEALTH-ASSESSMENT.md](./SYSTEM-HEALTH-ASSESSMENT.md) - Pre-cultivation readiness scores and work prioritization
- [CULTIVATION-PHASE-A-RISK-ANALYSIS.md](./CULTIVATION-PHASE-A-RISK-ANALYSIS.md) - Phase A: type hardening (COMPLETE)
- [CULTIVATION-PHASE-B-RISK-ANALYSIS.md](./CULTIVATION-PHASE-B-RISK-ANALYSIS.md) - Phase B: pagination caps (COMPLETE)
- [CULTIVATION-PHASE-C-RISK-ANALYSIS.md](./CULTIVATION-PHASE-C-RISK-ANALYSIS.md) - Phase C: service refactoring (COMPLETE)
- [CULTIVATION-PHASE-D-RISK-ANALYSIS.md](./CULTIVATION-PHASE-D-RISK-ANALYSIS.md) - Phase D: testing (244 tests, 177/178 passing)

---

## Useful Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run typecheck        # TypeScript validation
npm run types:generate   # Regenerate database types from Supabase
npm run test             # Run tests
```

---

## Verification Checklist

Before finishing work:
- [ ] `npm run build` passes
- [ ] `npm run typecheck` run; error count not higher than session-start baseline (baseline: **492 errors** as of 2026-02-18)
- [ ] Types imported from `@/types` (no duplicates created)
- [ ] Inventory changes use movement service (never direct updates)
- [ ] `batch_id` never null in inventory operations
- [ ] CHANGELOG.md updated with significant changes
- [ ] Hand-Off section updated in [AI-BUILD-SESSION-CHECKLIST.md](./AI-BUILD-SESSION-CHECKLIST.md)
