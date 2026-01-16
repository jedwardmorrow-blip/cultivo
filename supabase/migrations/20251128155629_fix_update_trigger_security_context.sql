/*
  # Fix Update Trigger Security Context

  ## Problem
  The fn_update_inventory_on_hand trigger tries to UPDATE inventory_items.on_hand_qty,
  but fn_block_direct_quantity_updates prevents it because the security context flag
  'app.allow_quantity_update' is not set.

  ## Solution
  Update fn_update_inventory_on_hand to set the security context flag before updating,
  similar to how fn_process_inventory_movement did it.

  ## Migration Date
  2025-11-28
*/

CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  -- RESERVE/RELEASE movements don't affect on_hand_qty
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

  -- Set security context to allow quantity update
  PERFORM set_config('app.allow_quantity_update', 'true', true);

  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Clear security context on error
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;

  -- Clear security context flag
  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION fn_update_inventory_on_hand IS
  'PRIMARY FUNCTION (SECURITY DEFINER): Updates inventory_items.on_hand_qty based on movement_kind using security context. RESERVE/RELEASE are NO-OP. Updated 2025-11-28.';
