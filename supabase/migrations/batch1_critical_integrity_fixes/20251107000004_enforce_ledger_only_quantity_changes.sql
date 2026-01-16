/*
  # Batch 1.4: Enforce Ledger-Only Quantity Changes
  
  ## Purpose
  Blocks direct updates to quantity fields. All changes must flow through inventory_movements.
  
  ## Changes
  1. Add trigger to block direct on_hand_qty updates on inventory_items
  2. Create/enhance trigger to update on_hand_qty from inventory_movements
  3. Add materialized view for ATP calculation (on_hand - reserves)
  4. Add validation function for movement_kind correctness
  
  ## Safety
  - Allows system/trigger updates via security context flag
  - Does NOT modify existing quantity values
  - Idempotent: Checks for existing triggers
*/

-- =====================================================
-- STEP 1: Create trigger to block direct quantity updates
-- =====================================================

CREATE OR REPLACE FUNCTION fn_block_direct_quantity_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow updates from triggers/system context
  -- Check for security context flag set by authorized triggers
  IF current_setting('app.allow_quantity_update', true) = 'true' THEN
    RETURN NEW;
  END IF;
  
  -- Block direct UPDATE of on_hand_qty
  IF TG_OP = 'UPDATE' AND OLD.on_hand_qty IS DISTINCT FROM NEW.on_hand_qty THEN
    RAISE EXCEPTION 'Direct updates to on_hand_qty are not allowed. All quantity changes must flow through inventory_movements table.'
    USING ERRCODE = 'integrity_constraint_violation',
          HINT = 'Insert a row into inventory_movements with appropriate movement_kind instead.',
          DETAIL = format('Item ID: %s, Attempted change: %s → %s', NEW.id, OLD.on_hand_qty, NEW.on_hand_qty);
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_block_direct_quantity_updates IS
'Prevents direct updates to on_hand_qty. Requires all quantity changes to flow through inventory_movements ledger.';

-- Create trigger
DROP TRIGGER IF EXISTS trg_block_direct_quantity_updates ON inventory_items;

CREATE TRIGGER trg_block_direct_quantity_updates
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_direct_quantity_updates();

COMMENT ON TRIGGER trg_block_direct_quantity_updates ON inventory_items IS
'Enforces ledger-only updates: Blocks direct on_hand_qty modifications.';

-- =====================================================
-- STEP 2: Create/enhance inventory movement processor
-- =====================================================

CREATE OR REPLACE FUNCTION fn_process_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id uuid;
  v_qty_delta numeric;
  v_current_qty numeric;
  v_new_qty numeric;
BEGIN
  -- Determine which item to update based on movement_kind
  v_item_id := CASE
    -- CONSUME, FULFILLMENT, RESERVE: Decrease source_item
    WHEN NEW.movement_kind IN ('CONSUME_SESSION_INPUT', 'FULFILLMENT') THEN NEW.source_item_id
    
    -- PRODUCE, RETURN, RELEASE, RECEIPT: Increase dest_item
    WHEN NEW.movement_kind IN ('PRODUCE_SESSION_OUTPUT', 'RETURN', 'RECEIPT') THEN NEW.dest_item_id
    
    -- ADJUSTMENT, RECONCILIATION: Absolute set on dest_item
    WHEN NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN NEW.dest_item_id
    
    -- RESERVE/RELEASE: Don't change on_hand_qty (only affects ATP)
    WHEN NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN NULL
    
    ELSE NULL
  END;
  
  -- Skip if no item to update
  IF v_item_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate quantity delta
  v_qty_delta := CASE
    -- Decrease operations (negative delta)
    WHEN NEW.movement_kind IN ('CONSUME_SESSION_INPUT', 'FULFILLMENT') THEN -NEW.qty
    
    -- Increase operations (positive delta)
    WHEN NEW.movement_kind IN ('PRODUCE_SESSION_OUTPUT', 'RETURN', 'RECEIPT') THEN NEW.qty
    
    -- Absolute set operations (ADJUSTMENT, RECONCILIATION)
    WHEN NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN NULL -- Handled separately
    
    ELSE 0
  END;
  
  -- Get current quantity
  SELECT on_hand_qty INTO v_current_qty
  FROM inventory_items
  WHERE id = v_item_id
  FOR UPDATE; -- Lock row for update
  
  IF v_current_qty IS NULL THEN
    RAISE EXCEPTION 'Inventory item % not found', v_item_id;
  END IF;
  
  -- Calculate new quantity
  IF NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') THEN
    -- Absolute set
    v_new_qty := NEW.qty;
  ELSE
    -- Delta change
    v_new_qty := v_current_qty + v_qty_delta;
  END IF;
  
  -- Prevent negative inventory
  IF v_new_qty < 0 THEN
    RAISE EXCEPTION 'Movement would result in negative inventory. Item: %, Current: %, Delta: %, New: %',
      v_item_id, v_current_qty, v_qty_delta, v_new_qty
    USING ERRCODE = 'check_violation',
          HINT = 'Verify the quantity and source item have sufficient on_hand_qty.';
  END IF;
  
  -- Update inventory item (set security context to allow trigger update)
  BEGIN
    -- Set flag to allow quantity update
    PERFORM set_config('app.allow_quantity_update', 'true', true); -- true = transaction-local
    
    -- Update quantity
    UPDATE inventory_items
    SET 
      on_hand_qty = v_new_qty,
      updated_at = now()
    WHERE id = v_item_id;
    
    -- Clear flag
    PERFORM set_config('app.allow_quantity_update', 'false', true);
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Ensure flag is cleared even on error
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;
  
  RAISE NOTICE 'Processed movement % for item %: % → % (delta: %)', 
    NEW.movement_kind, v_item_id, v_current_qty, v_new_qty, v_qty_delta;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_process_inventory_movement IS
'Processes inventory_movements and updates inventory_items.on_hand_qty via authorized trigger context.';

-- Create trigger
DROP TRIGGER IF EXISTS trg_process_inventory_movement ON inventory_movements;

CREATE TRIGGER trg_process_inventory_movement
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_process_inventory_movement();

COMMENT ON TRIGGER trg_process_inventory_movement ON inventory_movements IS
'Updates inventory_items.on_hand_qty based on inventory_movements ledger entries. ONLY authorized way to change quantities.';

-- =====================================================
-- STEP 3: Create ATP (Available-To-Promise) view
-- =====================================================

CREATE OR REPLACE VIEW v_inventory_atp AS
SELECT 
  ii.id as item_id,
  ii.package_id,
  ii.product_name,
  ii.product_id,
  ii.batch_id,
  ii.product_stage_id,
  ii.on_hand_qty,
  
  -- Calculate soft reserves from RESERVE movements
  COALESCE(
    (SELECT SUM(qty)
     FROM inventory_movements
     WHERE source_item_id = ii.id
       AND movement_kind = 'RESERVE'
    ), 0
  ) as reserved_qty,
  
  -- Calculate releases (which restore ATP)
  COALESCE(
    (SELECT SUM(qty)
     FROM inventory_movements
     WHERE dest_item_id = ii.id
       AND movement_kind = 'RELEASE'
    ), 0
  ) as released_qty,
  
  -- ATP = on_hand - (reserves - releases)
  ii.on_hand_qty - (
    COALESCE(
      (SELECT SUM(qty)
       FROM inventory_movements
       WHERE source_item_id = ii.id
         AND movement_kind = 'RESERVE'
      ), 0
    ) - COALESCE(
      (SELECT SUM(qty)
       FROM inventory_movements
       WHERE dest_item_id = ii.id
         AND movement_kind = 'RELEASE'
      ), 0
    )
  ) as atp_qty,
  
  ii.unit,
  ii.created_at,
  ii.updated_at
FROM inventory_items ii
WHERE ii.on_hand_qty > 0; -- Only show items with inventory

COMMENT ON VIEW v_inventory_atp IS
'Available-To-Promise calculation: on_hand_qty - (soft reserves - releases). 
RESERVE movements reduce ATP without changing on_hand. RELEASE movements restore ATP.
This is the source of truth for order allocation decisions.';

-- Grant access
GRANT SELECT ON v_inventory_atp TO authenticated;

-- =====================================================
-- STEP 4: Add movement_kind validation constraints
-- =====================================================

-- Ensure source_item_id XOR dest_item_id based on movement_kind
CREATE OR REPLACE FUNCTION fn_validate_movement_item_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate item_id usage based on movement_kind
  CASE NEW.movement_kind
    -- Source item required (decreases inventory)
    WHEN 'CONSUME_SESSION_INPUT', 'FULFILLMENT', 'RESERVE' THEN
      IF NEW.source_item_id IS NULL THEN
        RAISE EXCEPTION 'movement_kind % requires source_item_id', NEW.movement_kind;
      END IF;
      
    -- Dest item required (increases inventory)
    WHEN 'PRODUCE_SESSION_OUTPUT', 'RETURN', 'RECEIPT', 'RELEASE', 'ADJUSTMENT', 'RECONCILIATION' THEN
      IF NEW.dest_item_id IS NULL THEN
        RAISE EXCEPTION 'movement_kind % requires dest_item_id', NEW.movement_kind;
      END IF;
      
    ELSE
      RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
  END CASE;
  
  -- Validate qty is positive
  IF NEW.qty IS NULL OR NEW.qty <= 0 THEN
    RAISE EXCEPTION 'qty must be positive, got: %', NEW.qty;
  END IF;
  
  -- Validate reason_code for adjustments
  IF NEW.movement_kind IN ('ADJUSTMENT', 'RECONCILIATION') AND NEW.reason_code IS NULL THEN
    RAISE EXCEPTION 'movement_kind % requires reason_code', NEW.movement_kind;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_validate_movement_item_ids IS
'Validates inventory_movements have correct source/dest item references based on movement_kind.';

-- Create trigger
DROP TRIGGER IF EXISTS trg_validate_movement_item_ids ON inventory_movements;

CREATE TRIGGER trg_validate_movement_item_ids
  BEFORE INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_validate_movement_item_ids();

COMMENT ON TRIGGER trg_validate_movement_item_ids ON inventory_movements IS
'Validates movement_kind has appropriate source_item_id or dest_item_id populated.';

-- =====================================================
-- STEP 5: Add RLS to prevent DELETE on movements
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present (for idempotency)
DROP POLICY IF EXISTS "Block DELETE on inventory_movements" ON inventory_movements;

-- Create policy blocking DELETE
CREATE POLICY "Block DELETE on inventory_movements"
  ON inventory_movements
  FOR DELETE
  TO authenticated
  USING (false); -- Always deny DELETE

COMMENT ON POLICY "Block DELETE on inventory_movements" ON inventory_movements IS
'Immutable ledger: Prevents deletion of inventory movement records. Movements are append-only.';

-- Add policy blocking UPDATE on critical fields
DROP POLICY IF EXISTS "Block UPDATE on immutable movement fields" ON inventory_movements;

CREATE POLICY "Block UPDATE on immutable movement fields"
  ON inventory_movements
  FOR UPDATE
  TO authenticated
  USING (false); -- Always deny UPDATE

COMMENT ON POLICY "Block UPDATE on immutable movement fields" ON inventory_movements IS
'Immutable ledger: Prevents modification of inventory movement records after insertion.';

-- =====================================================
-- STEP 6: Validation tests
-- =====================================================

DO $$
DECLARE
  v_test_passed boolean := true;
BEGIN
  RAISE NOTICE 'Running ledger-only quantity change validation tests...';
  
  -- Test 1: Verify block trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_block_direct_quantity_updates'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Direct quantity update blocker not found';
  ELSE
    RAISE NOTICE '  ✓ Direct quantity update blocker exists';
  END IF;
  
  -- Test 2: Verify movement processor exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_process_inventory_movement'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Movement processor trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Movement processor trigger exists';
  END IF;
  
  -- Test 3: Verify ATP view exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'v_inventory_atp'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: ATP view not found';
  ELSE
    RAISE NOTICE '  ✓ ATP view exists';
  END IF;
  
  -- Test 4: Verify movement validation trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_validate_movement_item_ids'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: Movement validation trigger not found';
  ELSE
    RAISE NOTICE '  ✓ Movement validation trigger exists';
  END IF;
  
  -- Test 5: Verify RLS policies for immutability
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Block DELETE on inventory_movements'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: DELETE blocking policy not found';
  ELSE
    RAISE NOTICE '  ✓ DELETE blocking policy exists';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Block UPDATE on immutable movement fields'
  ) THEN
    v_test_passed := false;
    RAISE WARNING 'FAILED: UPDATE blocking policy not found';
  ELSE
    RAISE NOTICE '  ✓ UPDATE blocking policy exists';
  END IF;
  
  IF v_test_passed THEN
    RAISE NOTICE E'\n✅ All validation tests PASSED';
  ELSE
    RAISE EXCEPTION 'One or more validation tests FAILED. Check warnings above.';
  END IF;
END $$;

-- =====================================================
-- MIGRATION METADATA
-- =====================================================

COMMENT ON TRIGGER trg_block_direct_quantity_updates ON inventory_items IS
'Migration: 20251107000004_enforce_ledger_only_quantity_changes.sql
Status: Completed
Purpose: Enforce all quantity changes through inventory_movements ledger
Rollback: DROP TRIGGER trg_block_direct_quantity_updates ON inventory_items; DROP TRIGGER trg_process_inventory_movement ON inventory_movements;';
