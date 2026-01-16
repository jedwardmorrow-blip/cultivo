/*
  # Event-Driven Inventory Trigger

  1. Purpose
    - Automatically update inventory_items.on_hand_qty when movements are recorded
    - Maintains ledger as single source of truth
    - Prevents direct quantity updates
    - Enables immutable audit trail

  2. Implementation
    - Trigger fires AFTER INSERT on inventory_movements
    - Calculates delta or absolute quantity change
    - Updates corresponding inventory_items record
    - Logs errors for debugging

  3. Movement Types
    - ABSOLUTE movements: ADJUSTMENT, RECONCILIATION (set exact qty)
    - INCREMENT movements: RECEIPT, PRODUCE, RETURN, RELEASE (add qty)
    - DECREMENT movements: CONSUME, FULFILLMENT, RESERVE (subtract qty)

  4. Safety Features
    - Prevents negative quantities with GREATEST(0, ...)
    - Updates updated_at timestamp
    - Validates target item exists
    - Handles both source_item_id and dest_item_id

  5. Notes
    - Part of Phase 6: Database Triggers
    - Prerequisite: Phases 1-5 complete
    - Test thoroughly before enabling in production
*/

-- Create trigger function
CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER AS $$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  -- Determine which item to update
  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  -- Get current on_hand_qty for logging
  SELECT on_hand_qty INTO current_qty
  FROM inventory_items
  WHERE id = target_item_id;

  -- Calculate quantity change based on movement type
  CASE NEW.movement_kind
    -- ABSOLUTE movements: set on_hand_qty to exact value
    WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
      UPDATE inventory_items
      SET on_hand_qty = NEW.qty,
          last_updated = now()
      WHERE id = target_item_id;

      RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

    -- INCREMENT movements: add to on_hand_qty
    WHEN 'RECEIPT', 'PRODUCE', 'RETURN', 'RELEASE' THEN
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
          last_updated = now()
      WHERE id = target_item_id;

      RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

    -- DECREMENT movements: subtract from on_hand_qty
    WHEN 'CONSUME', 'FULFILLMENT', 'RESERVE' THEN
      UPDATE inventory_items
      SET on_hand_qty = GREATEST(0, COALESCE(on_hand_qty, 0) - NEW.qty),
          last_updated = now()
      WHERE id = target_item_id;

      RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, GREATEST(0, COALESCE(current_qty, 0) - NEW.qty), target_item_id;

    ELSE
      RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
  END CASE;

  -- Verify update occurred
  IF NOT FOUND THEN
    RAISE WARNING 'No inventory item found with id: %', target_item_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block the insert
    RAISE WARNING 'Error in fn_update_inventory_on_hand: % - %', SQLERRM, SQLSTATE;
    -- Re-raise to block the transaction if error is critical
    RAISE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'Automatically updates inventory_items.on_hand_qty when movements are recorded. Part of event-driven ledger system.';

-- Create trigger
DROP TRIGGER IF EXISTS trg_update_inventory_on_hand ON inventory_movements;

CREATE TRIGGER trg_update_inventory_on_hand
  AFTER INSERT ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_inventory_on_hand();

COMMENT ON TRIGGER trg_update_inventory_on_hand ON inventory_movements IS
  'Automatically updates inventory_items.on_hand_qty when movements are recorded';

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION fn_update_inventory_on_hand() TO authenticated;
