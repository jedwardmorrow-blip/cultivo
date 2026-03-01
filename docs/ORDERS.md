---
title: ORDERS
category: Sales & Fulfillment
version: 2.0
updated: 2026-03-01
---

# ORDERS - Sales & Fulfillment Workflow

> **Status:** Production Ready (Package Assignment Reservation System)
> **Purpose:** Defines order creation through fulfillment including package assignment, inventory reservation, and compliance documentation
> **Foundation:** Orders link to inventory packages via `package_assignments` - critical for traceability and compliance
> **Critical:** Package assignment reserves inventory at assignment time, deducts permanently at order completion

---

## TABLE OF CONTENTS

1. [Purpose](#purpose)
2. [Package Assignment System](#package-assignment-system)
3. [Architecture Overview](#architecture-overview)
4. [Inventory Reservation Lifecycle](#inventory-reservation-lifecycle)
5. [Order Creation Workflow](#order-creation-workflow)
6. [Package Assignment Workflow](#package-assignment-workflow)
7. [Order Completion & Fulfillment](#order-completion--fulfillment)
8. [Manifest & Delivery](#manifest--delivery)
9. [Order Status State Machine](#order-status-state-machine)
10. [Database Dependencies](#database-dependencies)
11. [Related Modules](#related-modules)

---

## Purpose

The Orders module manages the complete sales workflow from customer order submission through delivery confirmation:
- Order creation (internal UI or public form)
- Manager acceptance and validation
- **Package assignment with automatic inventory reservation** (trigger-based)
- Permanent inventory deduction on order completion
- Compliance documentation (coversheets with batch traceability)
- Manifest generation and delivery tracking

**Critical Principle:** Package assignments link order items to specific inventory packages. This creates the final link in the seed-to-sale traceability chain: Harvest Batch -> Processing Sessions -> Packaged Inventory -> Package Assignment -> Order -> Customer.

---

## Package Assignment System

> **Implemented:** 2026-03-01. Replaces the legacy `order_item_allocations` system which was fully removed.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│              PACKAGE ASSIGNMENTS ← TRACEABILITY CHAIN               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  inventory_items (packaged units)                                   │
│       ├─── package_id: "250106-GSC-PK-001"                         │
│       ├─── batch_id: links to harvest batch                        │
│       ├─── available_qty: 10 (decremented on assignment)           │
│       ├─── reserved_qty: 4 (incremented on assignment)             │
│       │                                                             │
│       └─── package_assignments (order linkage)                      │
│            ├─── order_id: links to customer order                  │
│            ├─── order_item_id: specific line item                  │
│            ├─── quantity_assigned: 4                                │
│            ├─── status: 'reserved' → 'fulfilled' → 'released'     │
│            │                                                        │
│            └─── TRIGGER: fn_reserve_inventory_on_assignment         │
│                 ├─── Creates RESERVE movement (audit trail)        │
│                 ├─── Decrements available_qty                       │
│                 ├─── Increments reserved_qty                        │
│                 └─── Validates sufficient available_qty             │
│                                                                     │
│  ON ORDER COMPLETION:                                               │
│  ─────────────────────────────────────────────────────────────      │
│  • TRIGGER: fn_fulfill_inventory_on_order_complete                  │
│  • Releases reservation (reserved_qty -= qty)                       │
│  • Deducts on_hand_qty (FULFILLMENT movement)                      │
│  • Sets assignment status → 'fulfilled'                             │
│  • Inventory permanently removed                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Assignment Status Lifecycle

| Status | Meaning | Trigger |
|--------|---------|---------|
| `reserved` | Inventory reserved, available_qty decremented | On INSERT into package_assignments |
| `fulfilled` | Inventory permanently deducted (on_hand_qty decremented) | On order status -> 'completed' |
| `released` | Reservation cancelled, available_qty restored | On order status -> 'cancelled' OR assignment deleted |

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Customer   │────>│   Order     │────>│  Packages   │────>│  Completed  │────>│  Manifest   │
│  Submits    │     │  Accepted   │     │  Assigned   │     │  Fulfilled  │     │  & Delivery │
│             │     │             │     │  (reserved) │     │ (deducted)  │     │             │
│ submitted   │     │  accepted   │     │ processing  │     │ready_for_   │     │ delivered   │
│             │     │             │     │             │     │  delivery   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

**Key Principles:**
- Orders can be created via internal UI or public customer form
- Package assignment can happen at any order stage (not gated by status)
- Assignment immediately reserves inventory via database trigger
- Completion permanently deducts inventory via database trigger
- Cancellation releases all reservations via database trigger
- One coversheet per order (compliance)
- Multi-stop manifests supported

---

## Inventory Reservation Lifecycle

### Reserve (On Package Assignment)

When a package is assigned to an order item, the `fn_reserve_inventory_on_assignment` trigger fires:

1. Validates `available_qty >= quantity_assigned`
2. Updates inventory: `available_qty -= qty`, `reserved_qty += qty`
3. Creates RESERVE movement (audit trail)
4. Sets assignment status = 'reserved'

### Release (On Assignment Removal or Order Cancellation)

When an assignment is deleted, `fn_release_inventory_on_unassignment` fires:
- Restores `available_qty += qty`, `reserved_qty -= qty`
- Creates RELEASE movement

When order status -> 'cancelled', `fn_release_inventory_on_order_cancel` fires:
- Releases all reserved assignments for that order
- Sets assignment status = 'released'

### Fulfill (On Order Completion)

When order status -> 'completed', `fn_fulfill_inventory_on_order_complete` fires:
1. For each 'reserved' assignment on the order:
   - Releases reservation: `reserved_qty -= qty`
   - Deducts on-hand: `on_hand_qty -= qty` (via FULFILLMENT movement)
   - Sets assignment status = 'fulfilled'
2. This is permanent and irreversible in normal operation

### Revert (On Status Change Away From Completed)

If an order status is changed away from 'completed', `fn_reverse_fulfillment_on_order_revert` fires:
- Creates RETURN movement to restore on_hand_qty
- Re-reserves inventory (sets status back to 'reserved')

---

## Order Creation Workflow

### Step 1: Customer Submits Order

**Internal UI Flow:**
```
Staff -> Select Customer -> Add Products -> Set Delivery Date -> Submit
```

**Public Form Flow:**
```
Customer -> Select Dispensary -> Add Products -> Request Delivery Date -> Submit
```

### Step 2: Manager Accepts Order

Status transition: 'submitted' -> 'accepted'

**Validation:**
- Customer is active (not suspended)
- Delivery date feasible
- Products exist in catalog

---

## Package Assignment Workflow

### Assigning Packages to Order Items

**UI Flow:**
```
Manager -> Order Details -> Order Item -> "Assign Package" -> Select Package -> Enter Quantity
```

**Service:** `packageAssignmentService.assignPackageToOrderItem()`

**Process:**
1. Frontend validates package availability via `validatePackageAvailability()`
2. INSERT into `package_assignments` (order_id, order_item_id, package_id, quantity_assigned)
3. Database trigger `fn_reserve_inventory_on_assignment` automatically:
   - Validates available_qty >= requested quantity
   - Decrements available_qty, increments reserved_qty
   - Creates RESERVE inventory movement
4. Assignment status defaults to 'reserved'

**Fulfillment Tracking:**
- `fulfillmentValidationService` calculates per-item and per-order fulfillment percentages
- UI shows fulfillment badges: Unfulfilled (red), Partially Fulfilled (yellow), Fully Fulfilled (green)
- Reservation status badges: Reserved (blue with lock icon), Fulfilled (green with shield icon)

### Removing Package Assignments

**Guard:** Fulfilled assignments cannot be removed (order has been completed)

**Process:**
1. Frontend calls `packageAssignmentService.removePackageAssignment()`
2. Service checks status != 'fulfilled'
3. DELETE from `package_assignments`
4. Database trigger `fn_release_inventory_on_unassignment` automatically restores available_qty

### Views

- **`inventory_reservation_summary`** - Per-item: total_qty, available_qty, reserved_qty, active_assignments count, assigned_order_ids
- **`package_assignments_with_reservations`** - Extended details view with inventory reservation context
- **`package_assignments_details`** - Joins with orders, order_items, inventory, labels for comprehensive display

---

## Order Completion & Fulfillment

### Completing an Order

When order status transitions to 'completed':

1. **Database trigger** `fn_fulfill_inventory_on_order_complete` fires
2. For each package assignment with status = 'reserved':
   - Releases reservation (reserved_qty decremented)
   - Creates FULFILLMENT movement (on_hand_qty decremented via movement trigger)
   - Sets assignment status = 'fulfilled'
3. Inventory is permanently removed from on-hand stock

**UI Hint:** "Inventory will be permanently deducted for all assigned packages."

### Cancelling an Order

When order status transitions to 'cancelled':

1. **Database trigger** `fn_release_inventory_on_order_cancel` fires
2. For each package assignment with status = 'reserved':
   - Restores reservation (available_qty incremented, reserved_qty decremented)
   - Creates RELEASE movement
   - Sets assignment status = 'released'

**UI Hint:** "Any reserved inventory will be released back to available stock."

---

## Manifest & Delivery

### Generate Manifest

**Service:** `manifestService.generateManifestData()`

Manifest generation pulls package data from `package_assignments` joined with `inventory_items` to get:
- Package IDs and batch numbers for each order item
- Net weight and gross weight
- Route calculations via OSRM

### Invoice Generation

**Service:** `invoiceService.generateInvoiceData()`

Invoice generation pulls package data from `package_assignments` to populate:
- Line item batch numbers and package IDs
- Per-item pricing and totals

---

## Order Status State Machine

**Valid Forward Transitions:**
- `submitted` -> `accepted` (manager approval)
- `accepted` -> `processing` (packages being assigned)
- `processing` -> `ready_for_delivery` (fulfillment complete)
- `ready_for_delivery` -> `delivered` (delivery confirmed)

**Valid Backward Transitions:**
- `accepted` -> `submitted` (revert acceptance)
- `processing` -> `accepted` (revert processing)
- `ready_for_delivery` -> `processing` (revert ready status)
- `delivered` -> `ready_for_delivery` (revert delivery)

**Cancellation:**
- Any non-terminal status -> `cancelled`
- Cancelled orders can be reopened -> `submitted`

**Inventory Side Effects:**
- `-> completed`: All reserved assignments fulfilled (permanent deduction)
- `-> cancelled`: All reserved assignments released (inventory restored)
- `completed ->` (revert): Fulfillment reversed, inventory re-reserved

**Enforcement:**
- Status transitions validated in `orderTransitions.ts` (frontend)
- `fn_validate_order_status_transition` trigger (database)
- Inventory operations are fully trigger-based (no app-layer involvement)

---

## Database Dependencies

### Core Tables
- **`orders`** - Order master records
  - Status: submitted -> accepted -> processing -> ready_for_delivery -> delivered -> cancelled
  - Indexes: order_number (UNIQUE), customer_id, status

- **`order_items`** - Line items
  - Indexes: order_id, product_id

- **`package_assignments`** - Links order items to inventory packages
  - Fields: order_id, order_item_id, package_id, quantity_assigned, status, label_id
  - Status: 'reserved' | 'fulfilled' | 'released'
  - Triggers: fn_reserve_inventory_on_assignment (AFTER INSERT), fn_release_inventory_on_unassignment (BEFORE DELETE)

### Triggers on orders
- **`fn_fulfill_inventory_on_order_complete`** - AFTER UPDATE, fires when status -> 'completed'
- **`fn_release_inventory_on_order_cancel`** - AFTER UPDATE, fires when status -> 'cancelled'
- **`fn_reverse_fulfillment_on_order_revert`** - AFTER UPDATE, fires when status leaves 'completed'

### Views
- **`inventory_reservation_summary`** - Per-inventory-item reservation aggregation
- **`package_assignments_with_reservations`** - Full assignment details with inventory context
- **`package_assignments_details`** - Assignment details with order, item, inventory, label joins

### Inventory Integration
- **`inventory_movements`** - Ledger entries
  - RESERVE: Soft allocation (decrements available_qty, not on_hand_qty)
  - RELEASE: Cancel allocation (restores available_qty)
  - FULFILLMENT: Hard deduction (decrements on_hand_qty)
  - RETURN: Reverse fulfillment (restores on_hand_qty)

### Legacy (REMOVED 2026-03-01)
The following were removed as part of the package assignment reservation system implementation:
- `order_item_allocations` table (replaced by `package_assignments`)
- `inventory_transactions` table (replaced by `inventory_movements`)
- `handle_order_status_change` trigger/function
- `deduct_inventory_for_order` / `restore_inventory_for_order` functions
- `allocation_fulfillment_update_trigger` trigger
- All `internal_bulk_inventory` / `internal_packaged_inventory` related functions

---

## Related Modules

### Upstream Dependencies
- **[INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md)** - Inventory movements and ATP
- **[BATCHES.md](./BATCHES.md)** - Batch lifecycle and COA linkage
- **[PRODUCTS.md](./PRODUCTS.md)** - Product catalog

### Downstream Consumers
- **[INVOICING-&-MANIFESTING.md](./INVOICING-&-MANIFESTING.md)** - Invoices & delivery
- **[COVER-SHEETS.md](./COVER-SHEETS.md)** - Compliance documents
- **[ANALYTICS.md](./ANALYTICS.md)** - Sales reporting & forecasting
- **[CRM.md](./CRM.md)** - Customer relationship management

### Key Files
- **Types:** `src/types/order.types.ts`, `src/features/orders/types/*.ts`
- **Services:** `src/features/orders/services/ordersService.ts`, `packageAssignment.service.ts`, `fulfillmentValidation.service.ts`
- **Hooks:** `src/features/orders/hooks/usePackageAssignments.ts`, `useOrdersContext.ts`
- **Components:** `PackageAssignmentModal.tsx`, `AssignedPackagesDisplay.tsx`, `StatusActionPanel.tsx`

---

**Last Updated:** 2026-03-01
**Version:** 2.0 (Package Assignment Reservation System)

**Version History:**
- **v2.0 (2026-03-01):** Complete rewrite for package assignment reservation system. Removed all legacy allocation references.
- **v1.3 (2025-11-12):** Added Sales Analytics integration references
- **v1.0 (2025-11-06):** Initial documentation
