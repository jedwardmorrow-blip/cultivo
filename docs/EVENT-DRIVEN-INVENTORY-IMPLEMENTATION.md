---
title: EVENT-DRIVEN-INVENTORY-IMPLEMENTATION
category: Implementation Guides
version: 1.0
updated: 2025-11-20
---

# EVENT-DRIVEN INVENTORY IMPLEMENTATION - Migration Guide

> **Status:** Implementation Guide
> **Purpose:** Phased migration from direct updates to event-driven inventory ledger
> **Foundation:** Maintains batch-centric architecture with immutable audit trail
> **Critical:** This guide ensures safe transition without data loss or service disruption
> **Cross-References:** [INVENTORY-TRACKING](./INVENTORY-TRACKING.md), [SYSTEM-WORKFLOW](./SYSTEM-WORKFLOW.md), [TEST-MODE](./TEST-MODE.md)

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Current State vs Target State](#current-state-vs-target-state)
3. [Migration Principles](#migration-principles)
4. [Phase 2: Movement Service Layer](#phase-2-movement-service-layer)
5. [Phase 3: Database Triggers](#phase-3-database-triggers)
6. [Phase 4: Service Migration](#phase-4-service-migration)
7. [Phase 5: Data Reconciliation](#phase-5-data-reconciliation)
8. [Testing Strategy](#testing-strategy)
9. [Rollback Procedures](#rollback-procedures)
10. [Performance Considerations](#performance-considerations)
11. [Related Documentation](#related-documentation)

---

## Overview

The event-driven inventory system creates an **immutable ledger** of all inventory movements, enabling complete audit trails, accurate batch traceability, and regulatory compliance. This guide documents the phased migration from the current direct-update pattern to the event-driven ledger architecture.

### Why Event-Driven Ledger?

**Compliance Benefits:**
- Complete audit trail required for cannabis regulations
- Immutable history prevents data tampering
- Batch-to-customer traceability for recalls
- Automated variance detection and reporting

**Operational Benefits:**
- Accurate inventory calculations from source of truth
- Concurrent operation support (no race conditions)
- Historical analysis and yield tracking
- Debugging capability through movement history

**Technical Benefits:**
- Single source of truth for all quantity changes
- Trigger-based automation reduces bugs
- Separation of concerns (ledger vs materialized view)
- Scalable architecture supporting growth

---

## Current State vs Target State

### Current Architecture (As of 2025-11-20)

**Direct Update Pattern:**

```typescript
// Current: Services directly update on_hand_qty
async function adjustInventory(itemId: string, newQty: number) {
  await supabase
    .from('inventory_items')
    .update({ on_hand_qty: newQty })
    .eq('id', itemId);
}
```

**Challenges:**
- No audit trail of why quantity changed
- Concurrent updates can cause race conditions
- Cannot reconstruct historical state
- Difficult to debug quantity discrepancies
- Limited traceability for compliance

**Services Using Direct Updates:**
- `audit.service.ts` - Physical count adjustments
- `conversions.service.ts` - Stage transition outputs
- Session completion workflows
- Order fulfillment (via deprecated inventory_transactions)

### Target Architecture (Event-Driven)

**Ledger Pattern:**

```typescript
// Target: All changes through inventory_movements
async function adjustInventory(itemId: string, newQty: number, reason: string) {
  // Insert movement (source of truth)
  await supabase
    .from('inventory_movements')
    .insert({
      movement_kind: 'ADJUSTMENT',
      dest_item_id: itemId,
      qty: newQty,
      unit: 'g',
      reason_code: reason,
      created_by: userId
    });

  // Trigger automatically updates inventory_items.on_hand_qty
}
```

**Benefits:**
- Complete audit trail with reason codes
- Immutable log prevents tampering
- Historical reconstruction possible
- Concurrent-safe through database serialization
- Regulatory compliance built-in

---

## Migration Principles

### Guiding Principles

1. **No Data Loss:** Every existing inventory record must be preserved
2. **Backward Compatibility:** Old services continue working during migration
3. **Incremental Rollout:** Migrate one service at a time with testing
4. **Rollback Ready:** Each phase has documented rollback procedure
5. **Test Mode Integration:** Test mode works with both patterns
6. **Zero Downtime:** Migration happens with system running

### Migration Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASED MIGRATION STRATEGY                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Phase 1: Documentation (COMPLETE - 2025-01-24)                      │
│   ✅ Architecture design                                            │
│   ✅ Migration guide created                                        │
│   ✅ Test mode integration documented                               │
│                                                                       │
│ Phase 2: Test Mode System (COMPLETE - 2025-01-24)                   │
│   ✅ Create test_mode_audit_log table with RLS                      │
│   ✅ Build TestModeContext and services                             │
│   ✅ Add test mode banner and UI components                         │
│   ✅ Integrate test mode validation hooks                           │
│                                                                       │
│ Phase 3: Movement Service Layer (COMPLETE - 2025-01-24)             │
│   ✅ Create inventoryMovementService                                │
│   ✅ Build 9 movement type handlers                                 │
│   ✅ Add validation and error handling                              │
│   ✅ Test with existing data (no trigger yet)                       │
│                                                                       │
│ Phase 4: UI Components (COMPLETE - 2025-01-24)                      │
│   ✅ TestModeBanner component                                       │
│   ✅ TestModeToggle for admin control                               │
│   ✅ TestModeAuditLog viewer                                        │
│   ✅ MovementHistory viewer                                         │
│                                                                       │
│ Phase 5: Data Reconciliation (COMPLETE - 2025-01-24)                │
│   ✅ Create reconciliation SQL functions                            │
│   ✅ Build inventoryReconciliationService                           │
│   ✅ Create ReconciliationDashboard UI                              │
│   ✅ Integrate into Inventory section                               │
│                                                                       │
│ Phase 6: Database Triggers (IN PROGRESS - 2025-01-24)               │
│   🔄 Create trigger for on_hand_qty updates                         │
│   🔄 Add immutability constraints                                   │
│   🔄 Add trigger validation and monitoring                          │
│   🔄 Enable trigger with testing utilities                          │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 2-5: Implementation Complete (2025-01-24)

**Summary:** Phases 2-5 have been successfully implemented and deployed. The following components are now operational:

- **Test Mode System**: Complete with audit logging, UI components, and admin controls
- **Movement Service Layer**: Full service with 9 movement types and validation
- **UI Components**: TestModeBanner, TestModeToggle, TestModeAuditLog, MovementHistory
- **Data Reconciliation**: Complete reconciliation service with dashboard and verification tools

**Status:** Foundation complete and ready for Phase 6 (Database Triggers)

---

## Phase 6: Database Triggers (IN PROGRESS)

**Note:** This phase implements database triggers to automatically update inventory quantities when movements are recorded. All prerequisite phases (1-5) are complete.

### 6.1 Core Movement Trigger

**Purpose:** Automatically update `inventory_items.on_hand_qty` when movements are recorded

### Implementation Details Below

---

## Phase 2: Movement Service Layer (Reference - COMPLETE)

### 2.1 Create Movement Service

**File:** `src/services/inventoryMovement.service.ts`

**Purpose:** Centralized service for recording all inventory movements

**Core Interface:**

```typescript
export interface InventoryMovement {
  movement_kind: MovementKind;
  source_item_id?: string;
  dest_item_id?: string;
  qty: number;
  unit: string;
  reason_code?: string;
  reference_id?: string; // session_id, order_id, audit_id, etc.
  reference_type?: string; // 'trim_session', 'order', 'audit', etc.
  notes?: string;
  created_by?: string;
}

export type MovementKind =
  | 'RECEIPT'
  | 'CONSUME'
  | 'PRODUCE'
  | 'FULFILLMENT'
  | 'RETURN'
  | 'RESERVE'
  | 'RELEASE'
  | 'ADJUSTMENT'
  | 'RECONCILIATION';

export interface MovementResult {
  success: boolean;
  movement_id?: string;
  error?: string;
}
```

**Service Implementation:**

```typescript
import { supabase } from '@/lib/supabase';
import { InventoryMovement, MovementResult } from './types';

export class InventoryMovementService {
  /**
   * Record an inventory movement
   */
  async recordMovement(
    movement: InventoryMovement
  ): Promise<MovementResult> {
    try {
      // Validate movement
      this.validateMovement(movement);

      // Insert movement
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
          movement_kind: movement.movement_kind,
          source_item_id: movement.source_item_id,
          dest_item_id: movement.dest_item_id,
          qty: movement.qty,
          unit: movement.unit,
          reason_code: movement.reason_code,
          reference_id: movement.reference_id,
          reference_type: movement.reference_type,
          notes: movement.notes,
          created_by: movement.created_by
        })
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        movement_id: data.id
      };
    } catch (error) {
      console.error('Failed to record movement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate movement before recording
   */
  private validateMovement(movement: InventoryMovement): void {
    // CONSUME, FULFILLMENT, RESERVE require source_item_id
    if (['CONSUME', 'FULFILLMENT', 'RESERVE'].includes(movement.movement_kind)) {
      if (!movement.source_item_id) {
        throw new Error(`${movement.movement_kind} requires source_item_id`);
      }
    }

    // RECEIPT, PRODUCE, RETURN, RELEASE, ADJUSTMENT, RECONCILIATION require dest_item_id
    if (['RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION']
        .includes(movement.movement_kind)) {
      if (!movement.dest_item_id) {
        throw new Error(`${movement.movement_kind} requires dest_item_id`);
      }
    }

    // Quantity must be positive
    if (movement.qty <= 0) {
      throw new Error('Movement quantity must be positive');
    }

    // Unit is required
    if (!movement.unit) {
      throw new Error('Unit is required');
    }
  }

  /**
   * Get movement history for an inventory item
   */
  async getMovementHistory(
    itemId: string,
    limit: number = 50
  ): Promise<InventoryMovement[]> {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .or(`source_item_id.eq.${itemId},dest_item_id.eq.${itemId}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch movement history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate current on_hand_qty from movements (for reconciliation)
   */
  async calculateOnHandFromMovements(itemId: string): Promise<number> {
    const movements = await this.getMovementHistory(itemId, 1000);

    let total = 0;

    for (const movement of movements) {
      switch (movement.movement_kind) {
        case 'ADJUSTMENT':
        case 'RECONCILIATION':
          // Absolute values - set to qty directly
          total = movement.qty;
          break;

        case 'RECEIPT':
        case 'PRODUCE':
        case 'RETURN':
        case 'RELEASE':
          // Increment movements
          if (movement.dest_item_id === itemId) {
            total += movement.qty;
          }
          break;

        case 'CONSUME':
        case 'FULFILLMENT':
        case 'RESERVE':
          // Decrement movements
          if (movement.source_item_id === itemId) {
            total -= movement.qty;
          }
          break;
      }
    }

    return Math.max(0, total); // Ensure non-negative
  }
}

export const inventoryMovementService = new InventoryMovementService();
```

### 2.2 Movement Type Handlers

**Create specialized handlers for each movement type:**

```typescript
// src/services/movementHandlers.ts

import { inventoryMovementService } from './inventoryMovement.service';

/**
 * Record inventory receipt (initial stock)
 */
export async function recordReceipt(
  itemId: string,
  qty: number,
  notes?: string
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RECEIPT',
    dest_item_id: itemId,
    qty,
    unit: 'g',
    reason_code: 'initial_receipt',
    notes
  });
}

/**
 * Record session consumption (input used)
 */
export async function recordConsumption(
  sourceItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking'
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'CONSUME',
    source_item_id: sourceItemId,
    qty,
    unit: 'g',
    reference_id: sessionId,
    reference_type: `${sessionType}_session`
  });
}

/**
 * Record session production (output created)
 */
export async function recordProduction(
  destItemId: string,
  qty: number,
  sessionId: string,
  sessionType: 'trim' | 'packaging' | 'bucking'
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'PRODUCE',
    dest_item_id: destItemId,
    qty,
    unit: 'g',
    reference_id: sessionId,
    reference_type: `${sessionType}_session`
  });
}

/**
 * Record order fulfillment (inventory shipped)
 */
export async function recordFulfillment(
  sourceItemId: string,
  qty: number,
  orderId: string
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'FULFILLMENT',
    source_item_id: sourceItemId,
    qty,
    unit: 'g',
    reference_id: orderId,
    reference_type: 'order'
  });
}

/**
 * Record manual adjustment
 */
export async function recordAdjustment(
  itemId: string,
  newQty: number,
  reason: string,
  notes?: string
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'ADJUSTMENT',
    dest_item_id: itemId,
    qty: newQty,
    unit: 'g',
    reason_code: reason,
    notes
  });
}

/**
 * Record physical count reconciliation
 */
export async function recordReconciliation(
  itemId: string,
  countedQty: number,
  auditId: string,
  varianceReason?: string
) {
  return inventoryMovementService.recordMovement({
    movement_kind: 'RECONCILIATION',
    dest_item_id: itemId,
    qty: countedQty,
    unit: 'g',
    reason_code: varianceReason,
    reference_id: auditId,
    reference_type: 'inventory_audit'
  });
}
```

### 2.3 Test Mode Integration

**Add test mode bypass to movement service:**

```typescript
export class InventoryMovementService {
  async recordMovement(
    movement: InventoryMovement,
    isTestMode: boolean = false
  ): Promise<MovementResult> {
    try {
      // Validate movement
      this.validateMovement(movement);

      if (isTestMode) {
        // Log test mode bypass
        await this.logTestModeBypass(movement);

        // In test mode, movements are optional
        // Return success without actually creating movement
        return {
          success: true,
          movement_id: 'test-mode-skip'
        };
      }

      // Normal production flow...
      // (insert movement as shown above)
    } catch (error) {
      // Error handling...
    }
  }

  private async logTestModeBypass(movement: InventoryMovement): Promise<void> {
    await supabase
      .from('test_mode_audit_log')
      .insert({
        action: 'skip_inventory_movement',
        validation_bypassed: 'inventory_movement_logging',
        context: {
          movement_kind: movement.movement_kind,
          qty: movement.qty,
          reason_code: movement.reason_code,
          message: 'Test mode: Movement logging skipped'
        }
      });
  }
}
```

---

## Phase 6: Database Triggers (COMPLETE - 2025-01-24)

**Status:** ✅ Complete and operational

**Implementation Summary:**
- Core movement trigger created (updates on_hand_qty automatically)
- Immutability policies enforced (append-only ledger)
- Validation trigger prevents invalid movements
- Monitoring and error logging implemented
- Testing utilities and rollback procedures documented

**See:** [DATABASE-TRIGGERS.md](./DATABASE-TRIGGERS.md) for complete documentation

### 6.1 Create Trigger Function (Reference)

**Migration File:** `supabase/migrations/create_movement_trigger.sql` (Applied)

```sql
/*
  # Event-Driven Inventory Trigger

  1. Purpose
    - Automatically update inventory_items.on_hand_qty when movements are recorded
    - Maintains ledger as single source of truth
    - Prevents direct quantity updates

  2. Implementation
    - Trigger fires AFTER INSERT on inventory_movements
    - Calculates delta or absolute quantity change
    - Updates corresponding inventory_items record
    - Logs errors for debugging

  3. Movement Types
    - DELTA movements: CONSUME, PRODUCE, FULFILLMENT, RETURN
    - ABSOLUTE movements: ADJUSTMENT, RECONCILIATION
    - ATP-only movements: RESERVE, RELEASE (no on_hand change)
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id uuid;
  qty_change numeric;
BEGIN
  -- Determine which item to update
  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  -- Calculate quantity change based on movement type
  CASE NEW.movement_kind
    -- ABSOLUTE movements: set on_hand_qty to exact value
    WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
      UPDATE inventory_items
      SET on_hand_qty = NEW.qty,
          updated_at = now()
      WHERE id = target_item_id;

    -- INCREMENT movements: add to on_hand_qty
    WHEN 'RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE' THEN
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
          updated_at = now()
      WHERE id = target_item_id;

    -- DECREMENT movements: subtract from on_hand_qty
    WHEN 'CONSUME', 'FULFILLMENT', 'RESERVE' THEN
      UPDATE inventory_items
      SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
          updated_at = now()
      WHERE id = target_item_id;

    ELSE
      RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_inventory_on_hand ON inventory_movements;

CREATE TRIGGER trg_update_inventory_on_hand
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_inventory_on_hand();

-- Add comment
COMMENT ON TRIGGER trg_update_inventory_on_hand ON inventory_movements IS
  'Automatically updates inventory_items.on_hand_qty when movements are recorded';
```

### 3.2 Prevent Direct Updates

**Add RLS policy to block direct on_hand_qty updates:**

```sql
/*
  # Block Direct Inventory Updates

  Prevent direct updates to on_hand_qty field.
  All changes must flow through inventory_movements.

  Exception: Admins can still update for emergency repairs.
*/

-- Create policy blocking on_hand_qty updates
CREATE POLICY "Block direct on_hand_qty updates"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow update if NOT changing on_hand_qty
    -- OR if user is admin
    (
      (OLD.on_hand_qty IS NOT DISTINCT FROM inventory_items.on_hand_qty)
      OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role = 'admin'
      )
    )
  );

COMMENT ON POLICY "Block direct on_hand_qty updates" ON inventory_items IS
  'Prevents direct quantity updates - forces use of inventory_movements ledger';
```

### 3.3 Immutability Constraints

**Prevent UPDATE/DELETE on movements:**

```sql
/*
  # Ledger Immutability

  Inventory movements are append-only.
  Updates and deletes are blocked to maintain audit trail.
*/

-- Block updates to movements
CREATE POLICY "Movements are immutable"
  ON inventory_movements
  FOR UPDATE
  TO authenticated
  USING (false);

-- Block deletes of movements
CREATE POLICY "Movements cannot be deleted"
  ON inventory_movements
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON POLICY "Movements are immutable" ON inventory_movements IS
  'Movements cannot be updated - ledger is append-only for audit integrity';

COMMENT ON POLICY "Movements cannot be deleted" ON inventory_movements IS
  'Movements cannot be deleted - use correcting entries instead';
```

---

## Phase 4: Service Migration

### 4.1 Migration Checklist

For each service using direct updates:

```
Service Migration Checklist:
□ Identify all direct update locations
□ Replace with movement service calls
□ Add appropriate reason codes
□ Include reference IDs (session, order, audit)
□ Add error handling
□ Test with existing data
□ Test with test mode enabled
□ Verify trigger updates on_hand_qty correctly
□ Update unit tests
□ Document breaking changes
```

### 4.2 Example: Audit Service Migration

**Before (Direct Update):**

```typescript
// audit.service.ts (OLD)
async function reconcileAuditLine(auditLineId: string) {
  const auditLine = await getAuditLine(auditLineId);

  // Direct update - NO AUDIT TRAIL
  await supabase
    .from('inventory_items')
    .update({ on_hand_qty: auditLine.counted_qty })
    .eq('id', auditLine.item_id);
}
```

**After (Event-Driven):**

```typescript
// audit.service.ts (NEW)
import { recordReconciliation } from '@/services/movementHandlers';

async function reconcileAuditLine(auditLineId: string) {
  const auditLine = await getAuditLine(auditLineId);

  // Record movement - CREATES AUDIT TRAIL
  const result = await recordReconciliation(
    auditLine.item_id,
    auditLine.counted_qty,
    auditLine.audit_id,
    auditLine.variance_reason
  );

  if (!result.success) {
    throw new Error(`Failed to reconcile: ${result.error}`);
  }

  // Trigger automatically updates on_hand_qty
}
```

### 4.3 Example: Session Completion Migration

**Before:**

```typescript
// sessions.service.ts (OLD)
async function completePackagingSession(sessionId: string) {
  const session = await getSession(sessionId);

  // Direct updates - NO LINEAGE
  await supabase
    .from('inventory_items')
    .update({ on_hand_qty: 0 })
    .eq('id', session.input_item_id);

  await supabase
    .from('inventory_items')
    .insert({
      batch_id: session.batch_id,
      stage: 'Packaged_3_5g',
      on_hand_qty: session.output_qty
    });
}
```

**After:**

```typescript
// sessions.service.ts (NEW)
import { recordConsumption, recordProduction } from '@/services/movementHandlers';

async function completePackagingSession(sessionId: string) {
  const session = await getSession(sessionId);

  // Record input consumption
  await recordConsumption(
    session.input_item_id,
    session.input_qty,
    sessionId,
    'packaging'
  );

  // Record output production
  await recordProduction(
    session.output_item_id, // Created earlier
    session.output_qty,
    sessionId,
    'packaging'
  );

  // Triggers automatically update on_hand_qty for both items
}
```

---

## Phase 5: Data Reconciliation

### 5.1 Reconciliation Query

**Compare ledger sums vs current on_hand_qty:**

```sql
-- Identify discrepancies
WITH movement_totals AS (
  SELECT
    COALESCE(source_item_id, dest_item_id) as item_id,
    SUM(
      CASE
        -- Absolute movements: take most recent
        WHEN movement_kind IN ('ADJUSTMENT', 'RECONCILIATION')
          THEN qty
        -- Increment movements
        WHEN movement_kind IN ('RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE')
          AND dest_item_id IS NOT NULL
          THEN qty
        -- Decrement movements
        WHEN movement_kind IN ('CONSUME', 'FULFILLMENT', 'RESERVE')
          AND source_item_id IS NOT NULL
          THEN -qty
        ELSE 0
      END
    ) as calculated_qty
  FROM inventory_movements
  GROUP BY COALESCE(source_item_id, dest_item_id)
)
SELECT
  ii.id,
  ii.package_id,
  ii.on_hand_qty as current_qty,
  mt.calculated_qty as ledger_qty,
  (ii.on_hand_qty - mt.calculated_qty) as discrepancy
FROM inventory_items ii
LEFT JOIN movement_totals mt ON mt.item_id = ii.id
WHERE ABS(ii.on_hand_qty - COALESCE(mt.calculated_qty, 0)) > 0.01
ORDER BY ABS(ii.on_hand_qty - COALESCE(mt.calculated_qty, 0)) DESC;
```

### 5.2 Reconciliation Process

1. **Review Discrepancies:** Investigate why ledger doesn't match on_hand_qty
2. **Create Correcting Entries:** Record RECONCILIATION movements to fix
3. **Verify Totals:** Re-run query to confirm discrepancies resolved
4. **Lock Down Direct Updates:** Enable RLS policy blocking direct updates

---

## Testing Strategy

### Unit Tests

```typescript
// inventoryMovement.service.test.ts
describe('InventoryMovementService', () => {
  describe('recordMovement', () => {
    it('should record RECEIPT movement', async () => {
      const result = await inventoryMovementService.recordMovement({
        movement_kind: 'RECEIPT',
        dest_item_id: 'item-123',
        qty: 100,
        unit: 'g'
      });

      expect(result.success).toBe(true);
      expect(result.movement_id).toBeDefined();
    });

    it('should reject CONSUME without source_item_id', async () => {
      const result = await inventoryMovementService.recordMovement({
        movement_kind: 'CONSUME',
        qty: 50,
        unit: 'g'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('requires source_item_id');
    });

    it('should reject negative quantities', async () => {
      const result = await inventoryMovementService.recordMovement({
        movement_kind: 'RECEIPT',
        dest_item_id: 'item-123',
        qty: -10,
        unit: 'g'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('must be positive');
    });
  });

  describe('calculateOnHandFromMovements', () => {
    it('should calculate correct total from movements', async () => {
      // Setup: Create item and movements
      const itemId = await createTestInventoryItem();

      await inventoryMovementService.recordMovement({
        movement_kind: 'RECEIPT',
        dest_item_id: itemId,
        qty: 1000,
        unit: 'g'
      });

      await inventoryMovementService.recordMovement({
        movement_kind: 'CONSUME',
        source_item_id: itemId,
        qty: 250,
        unit: 'g'
      });

      // Calculate
      const total = await inventoryMovementService
        .calculateOnHandFromMovements(itemId);

      expect(total).toBe(750);
    });
  });
});
```

### Integration Tests

```typescript
// session-inventory-integration.test.ts
describe('Session Inventory Integration', () => {
  it('should update inventory through movements on session completion', async () => {
    // Create session and input item
    const inputItem = await createTestInventoryItem({ on_hand_qty: 1000 });
    const session = await createTrimSession({ input_item_id: inputItem.id });

    // Complete session
    await completeSession(session.id);

    // Verify movements created
    const movements = await getMovementsForItem(inputItem.id);
    expect(movements).toHaveLength(2); // CONSUME + PRODUCE

    // Verify on_hand_qty updated by trigger
    const updatedItem = await getInventoryItem(inputItem.id);
    expect(updatedItem.on_hand_qty).toBe(0); // Fully consumed
  });
});
```

---

## Rollback Procedures

### Phase 2 Rollback (Service Layer)

**No database changes made - simple code revert:**

```bash
# Revert service layer changes
git revert <commit-hash>

# Remove movement service files
rm src/services/inventoryMovement.service.ts
rm src/services/movementHandlers.ts
```

### Phase 3 Rollback (Triggers)

**Disable triggers and policies:**

```sql
-- Disable trigger
DROP TRIGGER IF EXISTS trg_update_inventory_on_hand ON inventory_movements;

-- Re-enable direct updates
DROP POLICY IF EXISTS "Block direct on_hand_qty updates" ON inventory_items;

-- Allow movement updates/deletes (for cleanup)
DROP POLICY IF EXISTS "Movements are immutable" ON inventory_movements;
DROP POLICY IF EXISTS "Movements cannot be deleted" ON inventory_movements;
```

### Phase 4 Rollback (Service Migration)

**Revert individual service changes:**

```bash
# Revert specific service
git revert <service-commit-hash>

# Verify direct updates work again
npm run test
```

---

## Performance Considerations

### Trigger Optimization

**Ensure triggers perform well at scale:**

```sql
-- Add index on movement foreign keys
CREATE INDEX IF NOT EXISTS idx_movements_source_item
  ON inventory_movements(source_item_id);

CREATE INDEX IF NOT EXISTS idx_movements_dest_item
  ON inventory_movements(dest_item_id);

-- Add index on created_at for history queries
CREATE INDEX IF NOT EXISTS idx_movements_created_at
  ON inventory_movements(created_at DESC);
```

### Batch Operations

**For bulk movements, use transactions:**

```typescript
async function recordBulkMovements(movements: InventoryMovement[]) {
  const { error } = await supabase.rpc('record_bulk_movements', {
    movements_json: JSON.stringify(movements)
  });

  if (error) throw error;
}
```

### Monitoring

**Track movement recording performance:**

```sql
-- Movement recording rate
SELECT
  date_trunc('hour', created_at) as hour,
  movement_kind,
  COUNT(*) as movement_count
FROM inventory_movements
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, movement_kind
ORDER BY hour DESC;

-- Average trigger execution time (if logging enabled)
SELECT
  AVG(execution_time_ms) as avg_time,
  MAX(execution_time_ms) as max_time
FROM trigger_execution_log
WHERE trigger_name = 'trg_update_inventory_on_hand'
AND executed_at >= NOW() - INTERVAL '1 hour';
```

---

## Related Documentation

### Core Architecture
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Inventory system architecture
- [SYSTEM-WORKFLOW.md](./SYSTEM-WORKFLOW.md) - Workflow integration
- [BATCHES.md](./BATCHES.md) - Batch-centric foundation

### Implementation
- [TEST-MODE.md](./TEST-MODE.md) - Test mode integration
- [DOCS-INTEGRATION-PROGRESS.md](./DOCS-INTEGRATION-PROGRESS.md) - Implementation tracking
- [CHANGELOG.md](../CHANGELOG.md) - Change history

### Database
- Migration: `20251021000000_event_driven_inventory_schema_enhancements.sql`
- Migration: `batch1_critical_integrity_fixes/` - Batch integrity enforcement

---

## Notes

This implementation guide documents the phased migration to event-driven inventory. The approach balances safety, testing, and operational continuity. Each phase builds on the previous, with clear rollback procedures ensuring data integrity throughout the transition.

**Version History:**
- 1.0 (2025-11-20): Initial implementation guide created
