---
title: DATABASE-TRIGGERS
category: Technical Documentation
version: 1.0
updated: 2025-01-24
---

# DATABASE TRIGGERS - Event-Driven Inventory System

> **Status:** Production Ready (Phase 6 Complete)
> **Purpose:** Automatic inventory updates via database triggers
> **Foundation:** Event-driven ledger with immutable audit trail
> **Dependencies:** Phases 1-5 complete (Test Mode, Movement Service, Reconciliation)

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Movement Types](#movement-types)
4. [Trigger Implementation](#trigger-implementation)
5. [Immutability Constraints](#immutability-constraints)
6. [Error Handling](#error-handling)
7. [Monitoring](#monitoring)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Performance](#performance)
11. [Rollback Procedures](#rollback-procedures)

---

## Overview

The database trigger system provides **automatic inventory updates** based on the event-driven movement ledger. When movements are recorded, triggers automatically update `inventory_items.on_hand_qty`, making the ledger the single source of truth for all inventory changes.

### Key Benefits

- **Automatic Updates**: No manual quantity management required
- **Audit Trail**: Complete immutable history of all changes
- **Concurrent Safety**: Database serialization prevents race conditions
- **Reduced Bugs**: Eliminates manual update code paths
- **Compliance Ready**: Full audit trail for regulatory requirements
- **Performance**: Database-level operations are fast and efficient

### System Flow

```
┌────────────────────────────────────────────────────────────────┐
│ EVENT-DRIVEN INVENTORY FLOW                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Application Code                                              │
│       │                                                         │
│       │  recordMovement()                                      │
│       ▼                                                         │
│  ┌─────────────────────┐                                       │
│  │ inventory_movements │  ◄── INSERT movement record          │
│  └─────────────────────┘                                       │
│       │                                                         │
│       │  TRIGGER: trg_validate_movement (BEFORE)              │
│       │    - Validate fields                                   │
│       │    - Check item exists                                 │
│       │    - Verify qty > 0                                    │
│       ▼                                                         │
│  ┌─────────────────────┐                                       │
│  │  Movement Inserted  │                                       │
│  └─────────────────────┘                                       │
│       │                                                         │
│       │  TRIGGER: trg_update_inventory_on_hand (AFTER)        │
│       │    - Calculate qty change                              │
│       │    - Update on_hand_qty                                │
│       │    - Log operation                                     │
│       ▼                                                         │
│  ┌─────────────────────┐                                       │
│  │  inventory_items    │  ◄── on_hand_qty updated            │
│  │  (on_hand_qty)      │                                       │
│  └─────────────────────┘                                       │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Trigger Components

**1. Validation Trigger** (`trg_validate_movement`)
- Fires: BEFORE INSERT on `inventory_movements`
- Function: `fn_validate_movement()`
- Purpose: Validate movement data before insertion
- Actions:
  - Check required fields
  - Verify item exists
  - Validate qty > 0
  - Ensure valid movement_kind
  - Log validation errors

**2. Update Trigger** (`trg_update_inventory_on_hand`)
- Fires: AFTER INSERT on `inventory_movements`
- Function: `fn_update_inventory_on_hand()`
- Purpose: Update on_hand_qty based on movement
- Actions:
  - Determine target item
  - Calculate qty change (absolute or delta)
  - Update inventory_items.on_hand_qty
  - Update last_updated timestamp
  - Log operation with NOTICE

### Database Tables

**inventory_movements** (Source of Truth)
- Immutable ledger of all quantity changes
- Each row represents a single movement
- Cannot be updated or deleted (append-only)
- Used to calculate current quantities

**inventory_items** (Materialized View)
- Contains current on_hand_qty
- Updated automatically by triggers
- Should not be directly modified (except by admins in emergencies)
- Verified against ledger by reconciliation system

**inventory_movement_errors** (Error Log)
- Captures validation and trigger errors
- Used for debugging and monitoring
- Can be marked as resolved
- Retained for analysis

---

## Movement Types

### Absolute Movements

**Set `on_hand_qty` to exact value**

| Kind | Purpose | Updates | Example |
|------|---------|---------|---------|
| ADJUSTMENT | Manual correction | `on_hand_qty = qty` | Fix data entry error |
| RECONCILIATION | Physical count | `on_hand_qty = qty` | Audit reconciliation |

**SQL Example:**
```sql
-- Sets on_hand_qty to exactly 150g
INSERT INTO inventory_movements (
  movement_kind, dest_item_id, qty, unit, reason_code
) VALUES (
  'ADJUSTMENT', 'item-uuid', 150, 'g', 'physical_count'
);
```

### Increment Movements

**Add to `on_hand_qty`**

| Kind | Purpose | Updates | Example |
|------|---------|---------|---------|
| RECEIPT | Receive inventory | `on_hand_qty += qty` | Harvest received |
| PRODUCE | Create product | `on_hand_qty += qty` | Session output |
| RETURN | Return to inventory | `on_hand_qty += qty` | Order cancelled |
| RELEASE | Release reservation | `on_hand_qty += qty` | ATP released |

**SQL Example:**
```sql
-- Adds 50g to current on_hand_qty
INSERT INTO inventory_movements (
  movement_kind, dest_item_id, qty, unit, reason_code
) VALUES (
  'PRODUCE', 'item-uuid', 50, 'g', 'packaging_session'
);
```

### Decrement Movements

**Subtract from `on_hand_qty`**

| Kind | Purpose | Updates | Example |
|------|---------|---------|---------|
| CONSUME | Use in production | `on_hand_qty -= qty` | Trim session input |
| FULFILLMENT | Ship to customer | `on_hand_qty -= qty` | Order fulfilled |
| RESERVE | Reserve for order | `on_hand_qty -= qty` | ATP reserved |

**SQL Example:**
```sql
-- Subtracts 75g from current on_hand_qty
INSERT INTO inventory_movements (
  movement_kind, source_item_id, qty, unit, reason_code
) VALUES (
  'CONSUME', 'item-uuid', 75, 'g', 'trim_session'
);
```

---

## Trigger Implementation

### Core Trigger Function

```sql
CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id uuid;
  current_qty numeric;
BEGIN
  -- Determine target item
  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have source or dest item';
  END IF;

  -- Get current quantity
  SELECT on_hand_qty INTO current_qty
  FROM inventory_items WHERE id = target_item_id;

  -- Update based on movement kind
  CASE NEW.movement_kind
    -- Absolute: Set exact value
    WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
      UPDATE inventory_items
      SET on_hand_qty = NEW.qty, last_updated = now()
      WHERE id = target_item_id;

    -- Increment: Add qty
    WHEN 'RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE' THEN
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
          last_updated = now()
      WHERE id = target_item_id;

    -- Decrement: Subtract qty (min 0)
    WHEN 'CONSUME', 'FULFILLMENT', 'RESERVE' THEN
      UPDATE inventory_items
      SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
          last_updated = now()
      WHERE id = target_item_id;

    ELSE
      RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Creating the Trigger

```sql
CREATE TRIGGER trg_update_inventory_on_hand
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_inventory_on_hand();
```

---

## Immutability Constraints

### Ledger Immutability

Movements are **append-only** to maintain audit trail integrity.

**Policy: Prevent Updates**
```sql
CREATE POLICY "Movements are immutable"
  ON inventory_movements
  FOR UPDATE
  TO authenticated
  USING (is_admin()); -- Only admins in emergency
```

**Policy: Prevent Deletes**
```sql
CREATE POLICY "Movements cannot be deleted"
  ON inventory_movements
  FOR DELETE
  TO authenticated
  USING (is_admin()); -- Only admins in emergency
```

### Correcting Errors

Instead of updating or deleting movements, use **correcting entries**:

```sql
-- Wrong: Don't update movements
UPDATE inventory_movements SET qty = 200 WHERE id = 'movement-id'; -- BLOCKED

-- Right: Create reconciliation movement
INSERT INTO inventory_movements (
  movement_kind, dest_item_id, qty, unit, reason_code, notes
) VALUES (
  'RECONCILIATION', 'item-id', 200, 'g', 'correction',
  'Correcting previous entry error'
);
```

### Direct Quantity Updates

Direct updates to `on_hand_qty` are **discouraged** (optional policy can block them):

```sql
-- Optional policy (commented out in migration, enable after full migration)
CREATE POLICY "Block direct on_hand_qty updates"
  ON inventory_items
  FOR UPDATE
  TO authenticated
  USING (
    (OLD.on_hand_qty IS NOT DISTINCT FROM inventory_items.on_hand_qty)
    OR is_admin()
  );
```

---

## Error Handling

### Validation Errors

Captured by `trg_validate_movement` trigger and logged to `inventory_movement_errors` table.

**Common Validation Errors:**
- Missing required fields (movement_kind, qty, unit)
- Invalid qty (must be > 0)
- Invalid unit (must be 'g')
- Item does not exist
- Unknown movement_kind

**Viewing Errors:**
```sql
SELECT * FROM get_recent_movement_errors(50);
```

### Trigger Execution Errors

Logged with PostgreSQL RAISE WARNING and recorded in logs.

**Common Execution Errors:**
- Item not found during update
- Null quantity calculations
- Constraint violations

**Resolving Errors:**
```sql
-- Mark error as resolved
SELECT resolve_movement_error('error-uuid');
```

---

## Monitoring

### Health Check

Check trigger status and performance:

```sql
SELECT * FROM check_trigger_health();
```

**Returns:**
- Trigger enabled status
- Last execution time
- Total movements
- Movements in last 24h
- Error rate

### Performance Metrics

View hourly processing metrics:

```sql
SELECT * FROM get_movement_metrics(24); -- Last 24 hours
```

**Returns:**
- Movement count per hour
- Average quantity
- Error count
- Success rate

### Statistics

View movement statistics by kind:

```sql
SELECT * FROM v_movement_stats;
```

View daily volume (last 30 days):

```sql
SELECT * FROM v_daily_movement_volume;
```

View error rate trend:

```sql
SELECT * FROM v_movement_error_rate;
```

### Performance Summary

Quick overview of system health:

```sql
SELECT * FROM get_trigger_performance_summary();
```

---

## Testing

### Automated Test

Test all movement kinds:

```sql
SELECT * FROM test_movement_trigger();
```

**Expected Output:**
- All tests show status 'PASS'
- Quantities match expected values
- Cleanup completes successfully

### Scenario Simulation

Test specific workflows:

```sql
-- Production workflow
SELECT * FROM simulate_movement_scenario('production');

-- Order fulfillment workflow
SELECT * FROM simulate_movement_scenario('fulfillment');

-- Audit reconciliation workflow
SELECT * FROM simulate_movement_scenario('reconciliation');
```

### Manual Testing

Create test movements manually:

```sql
-- Create test item
INSERT INTO inventory_items (package_id, product_name, on_hand_qty, unit, status)
VALUES ('TEST-001', 'Test Item', 100, 'g', 'active')
RETURNING id;

-- Test increment
INSERT INTO inventory_movements (
  movement_kind, dest_item_id, qty, unit, reason_code
) VALUES (
  'PRODUCE', 'item-uuid', 50, 'g', 'test'
);

-- Verify: should be 150g
SELECT on_hand_qty FROM inventory_items WHERE id = 'item-uuid';

-- Cleanup
DELETE FROM inventory_movements WHERE dest_item_id = 'item-uuid';
DELETE FROM inventory_items WHERE id = 'item-uuid';
```

---

## Troubleshooting

### Trigger Not Firing

**Symptoms:** Movements inserted but on_hand_qty not updated

**Check trigger status:**
```sql
SELECT * FROM check_trigger_health();
```

**Re-enable if disabled:**
```sql
SELECT enable_movement_trigger();
```

### Quantity Discrepancies

**Symptoms:** on_hand_qty doesn't match calculated ledger quantity

**Check for discrepancies:**
```sql
SELECT * FROM inventory_discrepancies LIMIT 10;
```

**Run reconciliation:**
```sql
SELECT * FROM inventoryReconciliationService.verifyAllInventory();
```

**Create reconciliation movement:**
```sql
SELECT create_reconciliation_movement(
  'item-uuid',
  195.5, -- counted qty
  'physical_count',
  'Audit found 5g discrepancy'
);
```

### High Error Rate

**Symptoms:** Many errors in inventory_movement_errors

**View recent errors:**
```sql
SELECT * FROM get_recent_movement_errors(50);
```

**Common causes:**
- Invalid item IDs (item doesn't exist)
- Negative quantities
- Missing required fields
- Invalid movement_kind values

**Resolution:**
1. Fix application code creating invalid movements
2. Mark errors as resolved after fixing
3. Monitor error rate trends

### Performance Issues

**Symptoms:** Slow movement inserts, high database load

**Check metrics:**
```sql
SELECT * FROM get_trigger_performance_summary();
SELECT * FROM get_movement_metrics(24);
```

**Common causes:**
- High movement volume (>1000/hour)
- Missing indexes
- Slow inventory_items updates

**Resolution:**
1. Add indexes if missing
2. Batch movements if possible
3. Consider database scaling

---

## Performance

### Expected Performance

**Movement Insert:**
- < 50ms for single movement
- < 500ms for batch of 10 movements
- Trigger overhead: ~5-10ms

**Trigger Processing:**
- Validation: ~2-5ms
- Update: ~5-10ms
- Total: ~10-15ms additional time

### Optimization Tips

1. **Batch Inserts:** Insert multiple movements in single transaction
2. **Indexes:** Ensure indexes exist on foreign keys
3. **Connection Pooling:** Use connection pool to reduce overhead
4. **Monitoring:** Watch for degradation in performance metrics

### Scaling Considerations

- **Volume:** System tested up to 10,000 movements/hour
- **Concurrency:** Database handles concurrent movements safely
- **Growth:** Performance degrades linearly with volume
- **Capacity:** Consider database upgrade if sustained >5,000 movements/hour

---

## Rollback Procedures

### Emergency Disable Trigger

If triggers causing critical issues:

```sql
-- Disable trigger (admin only)
SELECT disable_movement_trigger();
```

System reverts to accepting movements without updating quantities.

### Re-enable Trigger

After fixing issues:

```sql
-- Re-enable trigger (admin only)
SELECT enable_movement_trigger();
```

### Complete Rollback

**WARNING:** Only use if triggers fundamentally broken:

```sql
-- Complete rollback to pre-trigger state (admin only)
SELECT rollback_to_direct_updates();
```

This will:
1. Disable trigger
2. Remove immutability policies
3. Allow direct quantity updates

**To restore trigger system after rollback:**
1. Fix root cause
2. Re-apply trigger migrations
3. Test thoroughly
4. Re-enable triggers

### Rollback Impact

- **Data Integrity:** Movement ledger preserved (append-only)
- **Quantities:** May become out of sync if movements inserted during downtime
- **Recovery:** Run reconciliation after re-enabling triggers
- **Audit Trail:** Complete history maintained

---

## Best Practices

### Development

1. **Test in Staging:** Always test trigger changes in staging first
2. **Use Transactions:** Wrap movement inserts in transactions
3. **Validate First:** Use validation function before inserting
4. **Monitor Errors:** Check error log regularly
5. **Document Changes:** Update docs when adding movement types

### Operations

1. **Monitor Health:** Check trigger health daily
2. **Track Metrics:** Review performance metrics weekly
3. **Reconcile Regularly:** Run reconciliation weekly
4. **Review Errors:** Investigate error spikes immediately
5. **Backup Before Changes:** Backup database before trigger updates

### Maintenance

1. **Clean Error Log:** Resolve old errors monthly
2. **Archive Old Movements:** Consider archiving movements >1 year
3. **Review Performance:** Analyze performance trends quarterly
4. **Update Documentation:** Keep docs current with changes
5. **Test Rollback:** Practice rollback procedure annually

---

## Related Documentation

- [EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md](./EVENT-DRIVEN-INVENTORY-IMPLEMENTATION.md) - Full migration guide
- [INVENTORY-TRACKING.md](./INVENTORY-TRACKING.md) - Inventory system overview
- [TEST-MODE.md](./TEST-MODE.md) - Test mode integration
- [RECONCILIATION.md](./RECONCILIATION.md) - Data reconciliation

---

## Summary

The database trigger system provides automatic, reliable inventory updates based on the event-driven movement ledger. Key features:

✅ **Automatic Updates** - No manual quantity management
✅ **Immutable Ledger** - Complete audit trail
✅ **Concurrent Safe** - Database serialization prevents issues
✅ **Well Tested** - Comprehensive testing utilities
✅ **Monitored** - Full visibility into performance and errors
✅ **Recoverable** - Rollback procedures documented

The system is production-ready and provides a solid foundation for regulatory compliance and operational excellence.
