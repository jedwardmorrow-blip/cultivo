---
title: AI Session Brief
category: AI Development
version: 2.6
updated: 2026-03-02 (Go-Live Plan v4.0 Documentation)
priority: READ THIS FIRST
---

# AI Session Brief - CULT Seed-to-Sale System

> **Read this first when starting any work session.**
> **Last Updated:** 2026-03-02 (Session: Go-Live Plan v4.0 Documentation)
> **Last Migration:** 2026-03-01 (Reservation triggers, legacy allocation removal, fulfillment triggers)
> **Build Status:** Passing
> **Go-Live Plan:** See [GO-LIVE-PLAN-v4.0.md](./GO-LIVE-PLAN-v4.0.md) -- schema-first migration to cult-ops Supabase

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
- Conversions (unpivoted by product type, per-product finalization, upstream water loss write-off) - working
- Inventory (event-driven ledger, ATP constraint, audit system) - working
- Batches (lifecycle management, COA linkage) - working
- Orders (pipeline, package assignment reservation, fulfillment triggers, invoicing, manifests) - working
- Customers, Analytics, Settings, Delivery - working

**Last 5 sessions (most recent first):**
1. 2026-03-06: Water Loss Write-Off on Conversions — Upstream variance write-off on ConversionModal review screen. Declare water loss before bagging, or write off entire small amounts without creating bags. Architecture Decision 20.
2. 2026-03-02: Go-Live Plan v4.0 Documentation — Schema-first migration strategy from Bolt.new to cult-ops Supabase (docs only, no code changes)
3. 2026-03-01: Package Assignment Reservation System — Removed legacy allocation system, added trigger-based inventory reservation on package assignments, fulfillment on order completion, release on cancellation
4. 2026-03-01: Order Status Workflow Overhaul — Bi-directional status controls, transition validation, StatusActionPanel
5. 2026-02-25: CRM Phase 2.5 — Chain hierarchy & delivery model

**Known deferred items:**
- **Cultivation module** — Sessions C-1/C-2/C-3 all COMPLETE. Fully operational.
- **Phase D** (testing): see `CULTIVATION-PHASE-D-RISK-ANALYSIS.md` — 244 tests, 177/178 passing; cultivation-specific tests not yet written
- UI/UX polish (command palette, table sorting, CSV export) — not yet scheduled
- Phase 6 (RLS anon policy removal) — post-cultivation, see [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md)
- See [OPTIMIZATION-ROADMAP.md](./OPTIMIZATION-ROADMAP.md) — Phases 1–6 documented; Phases 1–5 complete

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
- If working on CRM Sales Activity features: read [CRM.md](./CRM.md) Phase 2 section + [CRM-INTEGRATION-MAP.md](./CRM-INTEGRATION-MAP.md)

**Cultivation module docs:**
- [CULTIVATION.md](./CULTIVATION.md) - Scope, entities, lifecycle, UI screens (v1.3 — IMPLEMENTED)
- [CULTIVATION-ARCHITECTURE.md](./CULTIVATION-ARCHITECTURE.md) - Full schema, RLS, triggers, migration plan (v1.3 — live DB + migration files committed)
- [CULTIVATION-RULES.md](./CULTIVATION-RULES.md) - Invariants, decisions, error messages, test requirements (v1.3 — IMPLEMENTED)

**Cultivation Status (as of 2026-02-19):**

- ✅ C-1 (documentation) — complete
- ✅ C-2 (migrations: 5 tables + 9 triggers) — complete; migration SQL committed to `supabase/migrations/`
- ✅ C-3 (UI: 7 components, 3 hooks, service layer, StrainsManagement hardening) — complete
- ⏳ C-4 (operator testing + type generation) — recommended next steps:
  1. Create a grow room, plant group, advance to flower, complete a harvest — verify batch appears in Batches module
  2. Run `npm run types:generate` to pull in cultivation table types, then update `cultivation.types.ts` to derive from generated `database.types.ts`
  3. Fix `customers.service.test.ts` — 1 pre-existing failure (`zip` vs `postal_code`, line ~126)

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
