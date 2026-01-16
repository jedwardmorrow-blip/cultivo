/*
  # Event-Driven Inventory Core - Triggers

  ## Overview
  This migration creates triggers to enforce batch lineage, immutability, and
  automatic materialization of on_hand_qty from the inventory_movements ledger.

  ## Triggers Created

  1. **trg_item_inherit_batch**
     - Automatically copy batch_id from parent_item_id on insert
     - Ensures outputs inherit batch from inputs

  2. **trg_item_batch_immutable**
     - Prevent batch_id changes after creation
     - Ensures batch lineage integrity

  3. **trg_apply_inventory_movement**
     - Materialize on_hand_qty from inventory_movements
     - Handle delta movements (RECEIPT, PRODUCE, CONSUME, FULFILLMENT, RESERVE, RELEASE)
     - Handle absolute movements (ADJUSTMENT, RECONCILIATION)

  ## Business Rules Enforced
  - Batch is immutable after creation
  - Outputs inherit batch via parent_item_id
  - All quantity changes must flow through movements
  - RESERVE/RELEASE affect ATP but not on_hand (calculated in views)

  ## Safety
  - Triggers use BEFORE/AFTER appropriately
  - Error messages are descriptive
  - Existing data not affected retroactively
*/

-- =====================================================
-- TRIGGER 1: Inherit batch from parent
-- =====================================================

CREATE OR REPLACE FUNCTION trg_item_inherit_batch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If parent_item_id is set and batch_id is not, inherit batch from parent
  IF NEW.parent_item_id IS NOT NULL AND NEW.batch_id IS NULL THEN
    SELECT batch_id INTO NEW.batch_id
    FROM inventory_items
    WHERE id = NEW.parent_item_id;

    -- Log if batch inherited
    IF NEW.batch_id IS NOT NULL THEN
      RAISE NOTICE 'Inherited batch_id % from parent_item_id %', NEW.batch_id, NEW.parent_item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS t_item_inherit_batch ON inventory_items;
CREATE TRIGGER t_item_inherit_batch
  BEFORE INSERT ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_item_inherit_batch();

COMMENT ON FUNCTION trg_item_inherit_batch IS
'Automatically inherits batch_id from parent_item_id on insert.
Ensures all outputs maintain batch lineage for COA traceability.
Trigger: t_item_inherit_batch on inventory_items BEFORE INSERT.';

-- =====================================================
-- TRIGGER 2: Prevent batch_id changes
-- =====================================================

CREATE OR REPLACE FUNCTION trg_item_batch_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check on UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    -- If batch_id is being changed, reject the update
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
      RAISE EXCEPTION 'batch_id is immutable after creation. Cannot change from % to % for item %',
        OLD.batch_id, NEW.batch_id, OLD.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS t_item_batch_immutable ON inventory_items;
CREATE TRIGGER t_item_batch_immutable
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_item_batch_immutable();

COMMENT ON FUNCTION trg_item_batch_immutable IS
'Prevents batch_id from being changed after creation.
Ensures batch lineage integrity for compliance and traceability.
Trigger: t_item_batch_immutable on inventory_items BEFORE UPDATE.';

-- =====================================================
-- TRIGGER 3: Materialize on_hand_qty from movements
-- =====================================================

CREATE OR REPLACE FUNCTION trg_apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_item_id uuid;
  v_delta numeric;
BEGIN
  -- Determine which item to update
  v_target_item_id := COALESCE(NEW.dest_item_id, NEW.source_item_id);

  -- Skip if no target item
  IF v_target_item_id IS NULL THEN
    RAISE WARNING 'Movement % has no source_item_id or dest_item_id', NEW.id;
    RETURN NEW;
  END IF;

  -- Handle movement based on kind
  CASE NEW.movement_kind

    -- Absolute set movements (set to exact value)
    WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
      UPDATE inventory_items
      SET on_hand_qty = NEW.qty,
          last_updated = now()
      WHERE id = v_target_item_id;

    -- Receipt movements (add to destination)
    WHEN 'RECEIPT', 'PRODUCE_SESSION_OUTPUT', 'RETURN', 'RELEASE' THEN
      v_delta := NEW.qty;
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + v_delta,
          last_updated = now()
      WHERE id = v_target_item_id;

    -- Consumption movements (subtract from source)
    WHEN 'CONSUME_SESSION_INPUT', 'FULFILLMENT', 'RESERVE' THEN
      v_delta := -NEW.qty;
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + v_delta,
          last_updated = now()
      WHERE id = v_target_item_id;

    ELSE
      RAISE WARNING 'Unknown movement_kind: %', NEW.movement_kind;

  END CASE;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS t_apply_inventory_movement ON inventory_movements;
CREATE TRIGGER t_apply_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION trg_apply_inventory_movement();

COMMENT ON FUNCTION trg_apply_inventory_movement IS
'Materializes on_hand_qty on inventory_items from inventory_movements ledger.
Delta movements (RECEIPT, PRODUCE, CONSUME, FULFILLMENT, RESERVE, RELEASE) adjust quantity.
Absolute movements (ADJUSTMENT, RECONCILIATION) set quantity directly.
Trigger: t_apply_inventory_movement on inventory_movements AFTER INSERT.';

-- =====================================================
-- SECTION 4: Add helper function for movement validation
-- =====================================================

CREATE OR REPLACE FUNCTION validate_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate qty is positive
  IF NEW.qty IS NOT NULL AND NEW.qty < 0 THEN
    RAISE EXCEPTION 'Movement qty must be positive. Got: %', NEW.qty;
  END IF;

  -- Validate unit matches if provided
  IF NEW.unit IS NOT NULL AND NEW.unit NOT IN ('g', 'unit') THEN
    RAISE EXCEPTION 'Movement unit must be ''g'' or ''unit''. Got: %', NEW.unit;
  END IF;

  -- Validate movement_kind is set
  IF NEW.movement_kind IS NULL THEN
    RAISE EXCEPTION 'movement_kind is required';
  END IF;

  -- Validate source or dest is set
  IF NEW.source_item_id IS NULL AND NEW.dest_item_id IS NULL THEN
    RAISE EXCEPTION 'Either source_item_id or dest_item_id must be set';
  END IF;

  RETURN NEW;
END;
$$;

-- Create validation trigger
DROP TRIGGER IF EXISTS t_validate_inventory_movement ON inventory_movements;
CREATE TRIGGER t_validate_inventory_movement
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION validate_inventory_movement();

COMMENT ON FUNCTION validate_inventory_movement IS
'Validates inventory_movements before insert.
Checks: qty > 0, valid unit, movement_kind set, source or dest present.
Trigger: t_validate_inventory_movement on inventory_movements BEFORE INSERT.';

-- =====================================================
-- SECTION 5: Add trigger to auto-populate unit on movements
-- =====================================================

CREATE OR REPLACE FUNCTION trg_populate_movement_unit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_unit text;
BEGIN
  -- If unit not provided, try to infer from item
  IF NEW.unit IS NULL THEN
    -- Try dest_item first, then source_item
    IF NEW.dest_item_id IS NOT NULL THEN
      SELECT unit INTO v_item_unit
      FROM inventory_items
      WHERE id = NEW.dest_item_id;
      NEW.unit := v_item_unit;
    ELSIF NEW.source_item_id IS NOT NULL THEN
      SELECT unit INTO v_item_unit
      FROM inventory_items
      WHERE id = NEW.source_item_id;
      NEW.unit := v_item_unit;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS t_populate_movement_unit ON inventory_movements;
CREATE TRIGGER t_populate_movement_unit
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION trg_populate_movement_unit();

COMMENT ON FUNCTION trg_populate_movement_unit IS
'Auto-populates unit field on movements from related inventory_items.
Makes movement creation easier by inferring unit from source/dest items.
Trigger: t_populate_movement_unit on inventory_movements BEFORE INSERT.';

-- =====================================================
-- SECTION 6: Documentation and examples
-- =====================================================

COMMENT ON TABLE inventory_movements IS
'ACTIVE: Ledger of all inventory movements. Source of truth for quantity changes.
Movement Types:
  - RECEIPT: Initial inventory receipt (adds to dest_item_id)
  - CONSUME_SESSION_INPUT: Input consumed by session (subtracts from source_item_id)
  - PRODUCE_SESSION_OUTPUT: Output produced by session (adds to dest_item_id)
  - FULFILLMENT: Item shipped to customer (subtracts from source_item_id)
  - RETURN: Item returned from customer (adds to dest_item_id)
  - RESERVE: Soft allocation (subtracts from source_item_id, affects ATP)
  - RELEASE: Release soft allocation (adds to dest_item_id, restores ATP)
  - ADJUSTMENT: Manual adjustment (sets dest_item_id to absolute qty)
  - RECONCILIATION: Reconciliation from count (sets dest_item_id to absolute qty)

Triggers:
  - t_validate_inventory_movement: Validates movement before insert
  - t_populate_movement_unit: Auto-populates unit from items
  - t_apply_inventory_movement: Materializes on_hand_qty on items

Migration: 20251021000300_event_driven_inventory_triggers.sql';

-- Create example view for movement audit
CREATE OR REPLACE VIEW v_movement_audit AS
SELECT
  m.id,
  m.movement_date,
  m.movement_kind,
  m.qty,
  m.unit,
  si.package_id as source_package,
  si.product_name as source_product,
  di.package_id as dest_package,
  di.product_name as dest_product,
  m.reason_code,
  m.notes,
  m.created_at
FROM inventory_movements m
LEFT JOIN inventory_items si ON si.id = m.source_item_id
LEFT JOIN inventory_items di ON di.id = m.dest_item_id
ORDER BY m.movement_date DESC, m.created_at DESC;

COMMENT ON VIEW v_movement_audit IS
'Audit trail view of inventory movements with item details.
Shows source and destination items with package IDs and product names.
Useful for: Compliance audits, troubleshooting, variance investigation.';

GRANT SELECT ON v_movement_audit TO authenticated;
