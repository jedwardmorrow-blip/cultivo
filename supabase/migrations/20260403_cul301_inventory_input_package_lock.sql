-- CUL-301 / GAP-002: Add row-level lock + negative inventory guard to fn_update_inventory_on_hand
-- Prevents concurrent session double-deduction on source packages
--
-- Changes vs prior version:
-- 1. SELECT ... FOR UPDATE on inventory_items before any deduction (concurrent lock)
-- 2. CONSUME/FULFILLMENT: RAISE EXCEPTION on negative instead of GREATEST(0,...) silent floor
-- 3. RECEIPT/PRODUCE/RETURN/RESTORE: use locked current_qty for delta (not re-read)

CREATE OR REPLACE FUNCTION fn_update_inventory_on_hand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_item_id uuid;
  qty_change numeric;
  current_qty numeric;
BEGIN
  IF NEW.movement_kind IN ('RESERVE', 'RELEASE') THEN
    RAISE NOTICE 'RESERVE/RELEASE movement % - ATP handled by session triggers, no on_hand_qty change', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'session_finalization' THEN
    RAISE NOTICE 'Session finalization movement % - audit trail only, quantities set directly', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.reason_code = 'order_fulfillment' THEN
    RAISE NOTICE 'Order fulfillment movement % - audit trail only, quantities set by fulfillment trigger', NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.dest_item_id IS NOT NULL THEN
    target_item_id := NEW.dest_item_id;
  ELSIF NEW.source_item_id IS NOT NULL THEN
    target_item_id := NEW.source_item_id;
  ELSE
    RAISE EXCEPTION 'Movement must have either source_item_id or dest_item_id';
  END IF;

  -- GAP-002: Lock the row before reading to prevent concurrent double-deduction
  SELECT on_hand_qty INTO current_qty
  FROM inventory_items
  WHERE id = target_item_id
  FOR UPDATE;

  IF current_qty IS NULL THEN
    RAISE EXCEPTION 'Inventory item % not found', target_item_id;
  END IF;

  PERFORM set_config('app.allow_quantity_update', 'true', true);

  BEGIN
    CASE NEW.movement_kind
      WHEN 'ADJUSTMENT', 'RECONCILIATION' THEN
        UPDATE inventory_items
        SET on_hand_qty = NEW.qty,
            available_qty = NEW.qty - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Absolute movement: % -> % for item %', current_qty, NEW.qty, target_item_id;

      WHEN 'RECEIPT', 'PRODUCE', 'RETURN', 'RESTORE' THEN
        UPDATE inventory_items
        SET on_hand_qty = current_qty + NEW.qty,
            available_qty = current_qty + NEW.qty - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Increment movement: % + % = % for item %', current_qty, NEW.qty, (current_qty + NEW.qty), target_item_id;

      WHEN 'CONSUME', 'FULFILLMENT' THEN
        -- GAP-002: Raise exception instead of silently flooring to 0
        IF current_qty - NEW.qty < 0 THEN
          RAISE EXCEPTION 'Movement would result in negative inventory. Item: %, Current: %, Requested: %, Shortfall: %',
            target_item_id, current_qty, NEW.qty, (NEW.qty - current_qty)
          USING ERRCODE = 'check_violation',
          HINT = 'Verify the quantity and source item have sufficient on_hand_qty.',
          DETAIL = format('Movement ID: %s, Kind: %s', NEW.id, NEW.movement_kind);
        END IF;

        UPDATE inventory_items
        SET on_hand_qty = current_qty - NEW.qty,
            available_qty = (current_qty - NEW.qty) - COALESCE(reserved_qty, 0),
            last_updated = now()
        WHERE id = target_item_id;
        RAISE NOTICE 'Decrement movement: % - % = % for item %', current_qty, NEW.qty, (current_qty - NEW.qty), target_item_id;

      ELSE
        RAISE EXCEPTION 'Unknown movement_kind: %', NEW.movement_kind;
    END CASE;

    IF NOT FOUND THEN
      RAISE WARNING 'No inventory item found with id: %', target_item_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      PERFORM set_config('app.allow_quantity_update', 'false', true);
      RAISE;
  END;

  PERFORM set_config('app.allow_quantity_update', 'false', true);

  RETURN NEW;
END;
$$;
