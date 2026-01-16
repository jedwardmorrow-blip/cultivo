/*
  # Fix RESERVE/RELEASE Handling in Movement Trigger

  ## Problem
  The fn_update_inventory_on_hand trigger currently treats RESERVE as a DECREMENT movement
  and RELEASE as an INCREMENT movement. This is incorrect because:

  1. Session triggers (reserve_inventory_on_session_start) directly manage available_qty
     and reserved_qty for ATP (Available-To-Promise) tracking
  2. RESERVE/RELEASE movements should NOT affect on_hand_qty (physical inventory)
  3. They only affect ATP calculations (which should be view-based)

  ## Solution
  Update fn_update_inventory_on_hand to treat RESERVE/RELEASE as NO-OP movements.
  They create audit trail entries but don't change on_hand_qty.

  ## Context
  - on_hand_qty = Physical inventory (what's actually there)
  - available_qty = ATP (on_hand - reserved)
  - reserved_qty = Soft allocations for sessions

  ## Migration Date
  2025-11-28
*/

CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  -- RESERVE/RELEASE movements don't affect on_hand_qty
  -- They only affect ATP (available_qty/reserved_qty) which session triggers handle
  IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
    RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
    RETURN NEW;
  END IF;

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
    WHEN 'RECEIPT', 'PRODUCE', 'RETURN' THEN
      UPDATE inventory_items
      SET on_hand_qty = COALESCE(on_hand_qty, 0) + NEW.qty,
          last_updated = now()
      WHERE id = target_item_id;

      RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (COALESCE(current_qty, 0) + NEW.qty), target_item_id;

    -- DECREMENT movements: subtract from on_hand_qty
    WHEN 'CONSUME', 'FULFILLMENT' THEN
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
$function$;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION: Updates inventory_items.on_hand_qty based on movement_kind. RESERVE/RELEASE are NO-OP (ATP tracked separately). Movement kinds: CONSUME, PRODUCE, RECEIPT, FULFILLMENT, RETURN, ADJUSTMENT, RECONCILIATION. Updated 2025-11-28.';
