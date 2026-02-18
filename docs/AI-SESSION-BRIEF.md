---
title: AI Session Brief
category: AI Development
version: 2.0
updated: 2026-02-17
priority: READ THIS FIRST
---

# AI Session Brief - CULT Seed-to-Sale System

> **Read this first when starting any work session.**
> **Last Updated:** 2026-02-17
> **Last Migration:** 2026-02-16 (backfill_missing_produce_movements_for_conversion_items)
> **Build Status:** Passing

---

## System Overview (30 seconds)

Cannabis seed-to-sale tracking and production management system.

**Core Architecture:**
- **Batch-centric** - Everything links to batches (YYMMDD-STRAIN format)
- **Event-driven inventory** - Immutable ledger with automatic balance updates
- **Compliance-first** - COA tracking, AZDHS manifests, regulatory fields
- **Full lifecycle** - Harvest -> Buck -> Trim -> Package -> Order -> Deliver

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
1. 2026-02-17: Remediation sweep (cancelled_at fix, errorService import, COA sync, undo guard, docs)
2. 2026-02-17: Code quality sweep (dead code, alert replacement, console cleanup, unused imports)
3. 2026-02-16: Conversion VIEW row multiplication fix + missing audit movements backfill
4. 2026-02-16: Partial conversion support (SWF bucking session recovery)
5. 2026-02-05: Fixed cross-session package contamination in conversion views

**Known deferred items:**
- See [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) for the phased plan covering:
  - Type safety (1,045 tsc errors, duplicate types, double-casts)
  - Hardcoded values extraction (license numbers, stage UUIDs)
  - Service consolidation (3 duplicate order services)
  - Bundle size optimization (2,487 KB main chunk)
- UI/UX polish (command palette, table sorting, CSV export) -- not yet scheduled

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

**Cultivation module planning docs:**
- [SYSTEM-HEALTH-ASSESSMENT.md](./SYSTEM-HEALTH-ASSESSMENT.md) - Pre-cultivation readiness scores and work prioritization
- [CULTIVATION-PHASE-A-RISK-ANALYSIS.md](./CULTIVATION-PHASE-A-RISK-ANALYSIS.md) - Detailed risk breakdown for Phase A type hardening

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
- [ ] Types imported from `@/types` (no duplicates created)
- [ ] Inventory changes use movement service (never direct updates)
- [ ] `batch_id` never null in inventory operations
- [ ] CHANGELOG.md updated with significant changes
- [ ] Hand-Off section updated in [AI-BUILD-SESSION-CHECKLIST.md](./AI-BUILD-SESSION-CHECKLIST.md)
